/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromExpression, toExpression } from '@kbn/interpreter';
import type { SavedObjectReference } from '@kbn/core/server';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { encode, decode } from '../../common/lib/embeddable_dataurl';
import type { WorkpadAttributes } from '../routes/workpad/workpad_attributes';
import { embeddableService, logger } from '../kibana_services';

export const transformWorkpadIn = (
  workpad: WorkpadAttributes
): {
  attributes: WorkpadAttributes;
  references: SavedObjectReference[];
} => {
  const references: SavedObjectReference[] = [];
  const pages = workpad.pages.map((page) => {
    const elements = page.elements.map((element) => {
      if (!element.expression.includes('embeddable')) {
        return element;
      }
      const ast = fromExpression(element.expression);
      ast.chain = ast.chain.map((fn) => {
        if (fn.function === 'embeddable') {
          const embeddableConfig = decode(fn.arguments.config[0] as string);
          const embeddableType = fn.arguments.type[0] as string;
          // Temporary escape hatch for lens as code
          // TODO remove when lens as code transforms are ready for production
          const transformType =
            embeddableType === LENS_EMBEDDABLE_TYPE ? 'lens-dashboard-app' : embeddableType;
          const transforms = embeddableService.getTransforms(transformType);

          try {
            if (transforms?.transformIn) {
              const { state, references: panelReferences = [] } =
                transforms.transformIn(embeddableConfig);

              // Prefix references with the element id so we will know later which element it goes with
              references.push(
                ...panelReferences.map((reference) => ({
                  ...reference,
                  name: `${element.id}:${reference.name}`,
                }))
              );
              fn.arguments.config[0] = encode(state);
            }
          } catch (error) {
            logger.warn(
              `Error transforming workpad in: ${
                error instanceof Error ? error.message : String(error)
              }`
            );
          }
        }
        return fn;
      });
      return { ...element, expression: toExpression(ast, { type: 'expression' }) };
    });
    return { ...page, elements };
  });
  return { attributes: { ...workpad, pages }, references };
};
