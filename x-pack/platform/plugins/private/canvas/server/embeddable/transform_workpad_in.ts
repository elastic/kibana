/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { fromExpression, toExpression } from '@kbn/interpreter';
import type { SavedObjectReference } from '@kbn/core/server';
import { encode, decode } from '../../common/lib/embeddable_dataurl';
import type { WorkpadAttributes } from '../routes/workpad/workpad_attributes';
import { embeddableService } from '../kibana_services';

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
      const ast = fromExpression(element.expression); // ensure the expression is valid before encoding
      ast.chain = ast.chain.map((fn) => {
        if (fn.function === 'embeddable') {
          const embeddableConfig = decode(fn.arguments.config[0] as string);
          const embeddableType = fn.arguments.type[0] as string;
          const transforms = embeddableService.getTransforms(embeddableType);
          if (transforms?.transformIn) {
            const { state, references: panelReferences } = transforms.transformIn(embeddableConfig);
            references.push(...(panelReferences as SavedObjectReference[]));
            fn.arguments.config[0] = encode(state);
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
