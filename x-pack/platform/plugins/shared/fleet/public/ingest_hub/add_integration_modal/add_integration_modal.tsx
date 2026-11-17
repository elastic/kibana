/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo } from 'react';
import {
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiText,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { createMemoryHistory } from 'history';

import { Route, Routes } from '@kbn/shared-ux-router';

import { EmbeddedIntegrationsProvider } from '../../applications/integrations/embedded_app';
import { EPMApp } from '../../applications/integrations/sections/epm';
import { EmbeddedOnboarding } from '../onboarding/core/embedded_onboarding';
import { EMBEDDED_ONBOARDING_ROUTE } from '../onboarding/core/embedded_onboarding_route';

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
  const titleId = useGeneratedHtmlId({ prefix: 'fleetAddIntegrationModalTitle' });

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
      data-test-subj="fleetAddIntegrationModal"
    >
      <EuiModalHeader>
        <div>
          <EuiModalHeaderTitle id={titleId}>
            {title ??
              i18n.translate('xpack.fleet.addIntegrationModal.title', {
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
        <EmbeddedIntegrationsProvider history={history} onClose={onClose}>
          <Routes>
            {/* The onboarding wizard, for integrations that have one (today: AWS). Anything
                else falls through to the Integrations routes: catalogue, package detail and
                the add-integration page. */}
            <Route path={EMBEDDED_ONBOARDING_ROUTE}>
              <EmbeddedOnboarding />
            </Route>
            <Route>
              <EPMApp />
            </Route>
          </Routes>
        </EmbeddedIntegrationsProvider>
      </EuiModalBody>
    </EuiModal>
  );
}
