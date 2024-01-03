/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type {
  TypedLensByValueInput,
  InlineEditLensEmbeddableContext,
} from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { css } from '@emotion/react';
import {
  EuiFlexGroup,
  EuiFlexItem,
  EuiSpacer,
  EuiPanel,
  EuiButtonIcon,
  EuiTitle,
} from '@elastic/eui';
import type { LensChartLoadEvent } from '@kbn/visualization-utils';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder/config_builder';
import type { StartDependencies } from './plugin';
import { getConfigOptions } from './utils';

export const LensChart = (props: {
  configBuilder: LensConfigBuilder;
  plugins: StartDependencies;
  defaultDataView: DataView;
  isESQL?: boolean;
  container?: HTMLElement | null;
  setIsinlineEditingVisible?: (flag: boolean) => void;
  onApplyCb?: () => void;
  onCancelCb?: () => void;
}) => {
  const ref = useRef(false);
  const [embeddableInput, setEmbeddableInput] = useState<TypedLensByValueInput | undefined>(
    undefined
  );
  const [lensLoadEvent, setLensLoadEvent] = useState<LensChartLoadEvent | null>(null);

  const { config, options } = useMemo(() => {
    return getConfigOptions(props.defaultDataView, props.isESQL);
  }, [props.defaultDataView, props.isESQL]);

  useEffect(() => {
    ref.current = true;
    props.configBuilder.build(config, options).then((input) => {
      if (ref.current) {
        setEmbeddableInput(input as TypedLensByValueInput);
      }
    });
    return () => {
      ref.current = false;
    };
  }, [config, props.configBuilder, options, props.plugins.dataViews]);

  const onLoad = useCallback(
    (
      isLoading: boolean,
      adapters: LensChartLoadEvent['adapters'] | undefined,
      lensEmbeddableOutput$?: LensChartLoadEvent['embeddableOutput$']
    ) => {
      const adapterTables = adapters?.tables?.tables;
      if (adapterTables && !isLoading) {
        setLensLoadEvent({
          adapters,
          embeddableOutput$: lensEmbeddableOutput$,
        });
      }
    },
    []
  );

  const triggerOptions: InlineEditLensEmbeddableContext | undefined = useMemo(() => {
    if (lensLoadEvent && embeddableInput?.attributes) {
      return {
        attributes: embeddableInput?.attributes,
        lensEvent: lensLoadEvent,
        onUpdate: (newAttributes: TypedLensByValueInput['attributes']) => {
          if (embeddableInput) {
            const newInput = {
              ...embeddableInput,
              attributes: newAttributes,
            };
            setEmbeddableInput(newInput);
          }
        },
        onApply: () => {
          'optional onApply callback!';
          props.onApplyCb?.();
        },
        onCancel: () => {
          'optional onCancel callback!';
          props.onCancelCb?.();
        },
        container: props.container,
      };
    }
  }, [embeddableInput, lensLoadEvent, props]);
  const LensComponent = props.plugins.lens.EmbeddableComponent;

  return (
    <EuiPanel hasShadow={false}>
      <EuiTitle
        size="xs"
        css={css`
          text-align: center;
        `}
      >
        <h3>
          {props.isESQL
            ? '#1: Inline editing of an ES|QL chart.'
            : '#2: Inline editing of a dataview chart.'}
        </h3>
      </EuiTitle>
      <EuiSpacer />
      <EuiFlexGroup>
        <EuiFlexItem>
          {embeddableInput && (
            <LensComponent style={{ height: 500 }} {...embeddableInput} onLoad={onLoad} />
          )}
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiButtonIcon
            size="xs"
            iconType="pencil"
            onClick={() => {
              if (triggerOptions) {
                props.plugins.uiActions
                  .getTrigger('IN_APP_EMBEDDABLE_EDIT_TRIGGER')
                  .exec(triggerOptions);
                props?.setIsinlineEditingVisible?.(true);
              }
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
