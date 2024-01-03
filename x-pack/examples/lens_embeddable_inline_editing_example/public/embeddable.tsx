/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState, useRef, useEffect, useCallback, useMemo } from 'react';
import type { TypedLensByValueInput } from '@kbn/lens-plugin/public';
import type { DataView } from '@kbn/data-views-plugin/public';
import { EuiFlexGroup, EuiFlexItem, EuiSpacer, EuiPanel, EuiButtonIcon } from '@elastic/eui';
import type { LensChartLoadEvent } from '@kbn/visualization-utils';
import { LensConfigBuilder } from '@kbn/lens-embeddable-utils/config_builder/config_builder';
import type { StartDependencies } from './plugin';
import { getConfigOptions } from './utils';

export const LensChart = (props: {
  configBuilder: LensConfigBuilder;
  plugins: StartDependencies;
  defaultDataView: DataView;
  isESQL?: boolean;
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

  // type InlineEditLensEmbeddableContext
  const triggerOptions = {
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
      alert('optional onApply callback!');
    },
  };
  const LensComponent = props.plugins.lens.EmbeddableComponent;

  return (
    <EuiPanel hasShadow={false}>
      <p>
        {props.isESQL ? 'Inline editing of an ES|QL chart.' : 'Inline editing of a dataview chart.'}
      </p>
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
              props.plugins.uiActions
                .getTrigger('IN_APP_EMBEDDABLE_EDIT_TRIGGER')
                .exec(triggerOptions);
            }}
          />
        </EuiFlexItem>
      </EuiFlexGroup>
    </EuiPanel>
  );
};
