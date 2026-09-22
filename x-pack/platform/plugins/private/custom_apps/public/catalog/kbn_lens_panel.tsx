/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import { EuiCallOut } from '@elastic/eui';
import { EmbeddableRenderer } from '@kbn/embeddable-plugin/public';
import { LENS_EMBEDDABLE_TYPE } from '@kbn/lens-common';
import { useSearchApi } from '@kbn/presentation-publishing';
import { BehaviorSubject } from 'rxjs';
import type { CatalogComponent, ComponentRenderProps } from '@kbn/a2ui-renderer';
import { useCustomAppServices } from './services_context';

interface LensChildState {
  ref_id?: string;
  attributes?: object;
}

/**
 * Renders a Lens visualization, either by reference (a saved object id) or by
 * value (inline attributes).
 *
 * Both go through `EmbeddableRenderer` rather than Lens's `EmbeddableComponent`.
 * That component looks like the simpler option, but it builds its initial state
 * from `props.attributes` or an empty state and never threads `ref_id` through
 * to the child — so a by-reference panel renders a blank chart with no error.
 * `deserializeState` does honour `ref_id`, which `EmbeddableRenderer` reaches.
 */
function LensPanelRenderer({ props, accessibility }: ComponentRenderProps) {
  const services = useCustomAppServices();
  const savedObjectId = typeof props.savedObjectId === 'string' ? props.savedObjectId : undefined;
  const attributes =
    typeof props.attributes === 'object' && props.attributes !== null
      ? (props.attributes as object)
      : undefined;

  const searchApi = useSearchApi({ timeRange: services?.timeRange });

  const childState: LensChildState | undefined = useMemo(() => {
    if (savedObjectId) return { ref_id: savedObjectId };
    if (attributes) return { attributes };
    return undefined;
  }, [savedObjectId, attributes]);

  const viewMode$ = useMemo(() => new BehaviorSubject('view' as const), []);

  if (!childState) {
    return (
      <EuiCallOut
        announceOnMount
        size="s"
        color="danger"
        title="KbnLensPanel needs either a savedObjectId or attributes"
      />
    );
  }

  return (
    <div
      css={{ height: '100%', width: '100%' }}
      aria-label={accessibility?.label ?? 'Lens visualization'}
    >
      <EmbeddableRenderer
        type={LENS_EMBEDDABLE_TYPE}
        hidePanelChrome
        getParentApi={() => ({
          getSerializedStateForChild: () => childState,
          viewMode$,
          ...searchApi,
        })}
      />
    </div>
  );
}

export const KbnLensPanel: CatalogComponent = {
  name: 'KbnLensPanel',
  render: LensPanelRenderer,
};
