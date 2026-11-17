/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { Suspense, useMemo } from 'react';
import {
  EuiLoadingSpinner,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { createMemoryHistory } from 'history';
import { LazyEmbeddedIntegrationsProvider, LazyIntegrationsRoutes } from '@kbn/fleet-plugin/public';

export interface AddIntegrationModalProps {
  onClose: () => void;
  /** "Add data" in Streams, "Add integration" elsewhere. */
  title?: string;
  subtitle?: string;
  /** The catalogue opens here; e.g. `/detail/nginx/overview` to deep-link a package. */
  initialPath?: string;
}

const CATALOGUE_ENTRY = '/browse';

export function AddIntegrationModal({
  onClose,
  title,
  subtitle,
  initialPath = CATALOGUE_ENTRY,
}: AddIntegrationModalProps) {
  const titleId = useGeneratedHtmlId({ prefix: 'ingestHubAddIntegrationModalTitle' });

  // The Integrations pages drive their state through the URL. A memory history keeps all of that
  // navigation — filters, package detail, the add-integration page — inside the modal, so the
  // host's URL never changes and no Fleet routing code has to be made injectable.
  const history = useMemo(
    () => createMemoryHistory({ initialEntries: [initialPath] }),
    [initialPath]
  );

  return (
    <EuiModal
      onClose={onClose}
      aria-labelledby={titleId}
      maxWidth={false}
      css={{ inlineSize: '90vw', blockSize: '85vh' }}
      data-test-subj="ingestHubAddIntegrationModal"
    >
      <EuiModalHeader>
        <div>
          <EuiModalHeaderTitle id={titleId}>
            {title ??
              i18n.translate('xpack.ingestHub.addIntegrationModal.title', {
                defaultMessage: 'Add integration',
              })}
          </EuiModalHeaderTitle>
          {subtitle && (
            <EuiText size="s" color="subdued">
              {subtitle}
            </EuiText>
          )}
        </div>
      </EuiModalHeader>
      <EuiModalBody>
        <Suspense fallback={<EuiLoadingSpinner size="l" />}>
          <LazyEmbeddedIntegrationsProvider history={history} onClose={onClose}>
            <LazyIntegrationsRoutes />
          </LazyEmbeddedIntegrationsProvider>
        </Suspense>
      </EuiModalBody>
    </EuiModal>
  );
}
