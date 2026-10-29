/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useMemo, useState } from 'react';
import {
  EuiButtonEmpty,
  EuiFlyout,
  EuiFlyoutBody,
  EuiFlyoutFooter,
  EuiFlyoutHeader,
  EuiSpacer,
  EuiText,
  EuiTitle,
  useGeneratedHtmlId,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';
import { FormattedMessage } from '@kbn/i18n-react';
import { KbnWarningCallout } from '@kbn/ui-callout';
import { useImportConnectorTypes } from '../../hooks/use_import_connector_types';
import { CustomImportSetupFlyout } from './custom_import_setup_flyout';
import { ImportSourcePicker } from './import_source_picker';
import { buildImportSources } from './import_sources';
import type { ImportSource } from './import_sources';
import { ManagedImportSetupFlyout } from './managed_import_setup_flyout';

interface ImportSetupFlyoutProps {
  onClose: () => void;
  /** Called as soon as an import exists, so the list behind the flyout can refetch. */
  onCreated?: () => void;
}

/**
 * Set up an import: pick where the alerts come from, then go through the custom webhook form or
 * the managed flow for the picked connector.
 */
export const ImportSetupFlyout = ({ onClose, onCreated }: ImportSetupFlyoutProps) => {
  const [picked, setPicked] = useState<ImportSource | null>(null);

  if (picked?.kind === 'custom') {
    return (
      <CustomImportSetupFlyout
        onClose={onClose}
        onBack={() => setPicked(null)}
        onCreated={onCreated}
      />
    );
  }

  if (picked?.kind === 'connector') {
    return (
      <ManagedImportSetupFlyout
        source={picked}
        onClose={onClose}
        onBack={() => setPicked(null)}
        onCreated={onCreated}
      />
    );
  }

  return <SourcePickerFlyout onClose={onClose} onSelect={setPicked} />;
};

const SourcePickerFlyout = ({
  onClose,
  onSelect,
}: {
  onClose: () => void;
  onSelect: (source: ImportSource) => void;
}) => {
  const titleId = useGeneratedHtmlId({ prefix: 'importsSourcePickerFlyoutTitle' });
  const { data: connectorTypes, isLoading, isError } = useImportConnectorTypes();
  const sources = useMemo(() => buildImportSources(connectorTypes ?? []), [connectorTypes]);

  return (
    <EuiFlyout
      onClose={onClose}
      aria-labelledby={titleId}
      size="m"
      ownFocus
      data-test-subj="importsSetupFlyout"
    >
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m" id={titleId}>
          <h2 data-test-subj="importsSetupFlyoutTitle">
            <FormattedMessage
              id="xpack.alertingV2.imports.picker.title"
              defaultMessage="Set up import"
            />
          </h2>
        </EuiTitle>
        <EuiSpacer size="xs" />
        <EuiText size="s" color="subdued">
          <p>
            <FormattedMessage
              id="xpack.alertingV2.imports.picker.subtitle"
              defaultMessage="Choose where your alerts come from."
            />
          </p>
        </EuiText>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        {isError && (
          <>
            <KbnWarningCallout
              announceOnMount
              size="s"
              data-test-subj="importsSourcePickerConnectorsError"
              title={i18n.translate('xpack.alertingV2.imports.picker.connectorsErrorTitle', {
                defaultMessage: 'Connector sources could not be loaded',
              })}
              text={i18n.translate('xpack.alertingV2.imports.picker.connectorsErrorBody', {
                defaultMessage: 'You can still set up a custom webhook.',
              })}
            />
            <EuiSpacer size="m" />
          </>
        )}
        <ImportSourcePicker sources={sources} isLoading={isLoading} onSelect={onSelect} />
      </EuiFlyoutBody>
      <EuiFlyoutFooter>
        <EuiButtonEmpty onClick={onClose} data-test-subj="importsSetupCancel">
          <FormattedMessage id="xpack.alertingV2.imports.setup.cancel" defaultMessage="Cancel" />
        </EuiButtonEmpty>
      </EuiFlyoutFooter>
    </EuiFlyout>
  );
};
