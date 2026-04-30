/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useRef } from 'react';
import { EuiLoadingSpinner, EuiFlexGroup, EuiFlexItem } from '@elastic/eui';
import type { CoreStart } from '@kbn/core/public';

const LazyEmbeddableConversationInternal = React.lazy(async () => {
  const { EmbeddableConversationInternal } = await import('./embeddable_conversation');
  return { default: EmbeddableConversationInternal };
});

interface LazyEmbeddableConversationDependencies {
  services: unknown;
  coreStart: CoreStart;
}

export function createLazyEmbeddableConversation({
  services,
  coreStart,
}: LazyEmbeddableConversationDependencies): React.FC<Record<string, unknown>> {
  return function LazyEmbeddableConversation(props: Record<string, unknown>) {
    const loadingRef = useRef<HTMLDivElement>(null);

    return (
      <Suspense
        fallback={
          <EuiFlexGroup
            ref={loadingRef}
            alignItems="center"
            justifyContent="center"
            style={{ height: '100%', minHeight: 200 }}
          >
            <EuiFlexItem grow={false}>
              <EuiLoadingSpinner size="xl" />
            </EuiFlexItem>
          </EuiFlexGroup>
        }
      >
        <LazyEmbeddableConversationInternal
          {...(props as any)}
          onClose={(props.onClose as () => void) ?? (() => {})}
          ariaLabelledBy={(props.ariaLabelledBy as string) ?? ''}
          coreStart={coreStart}
          services={services}
        />
      </Suspense>
    );
  };
}
