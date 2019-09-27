/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import {
  EuiText,
  EuiSpacer,
  EuiCallOut,
  EuiSteps,
  EuiFlyout,
  EuiFlyoutHeader,
  EuiFlyoutBody,
  EuiTitle,
  EuiLink,
  EuiCode,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n/react';

import { ComponentStrings, ZIP, CANVAS, HTML } from '../../../../../i18n';
import { OnCopyFn, OnExportFn, OnCloseFn } from '../workpad_export';
import { WorkpadStep } from './workpad_step';
import { RuntimeStep } from './runtime_step';
import { SnippetsStep } from './snippets_step';

const { ShareWebsiteFlyout: strings } = ComponentStrings;

interface Props {
  onCopy: OnCopyFn;
  onExport: OnExportFn;
  onClose: OnCloseFn;
  unsupportedRenderers: string[];
}

const steps = (onExport: OnExportFn, onCopy: OnCopyFn) => [
  {
    title: strings.getWorkpadStepTitle(),
    children: <WorkpadStep {...{ onExport }} />,
  },
  {
    title: strings.getRuntimeStepTitle(),
    children: <RuntimeStep {...{ onExport }} />,
  },
  {
    title: strings.getSnippentsStepTitle(),
    children: <SnippetsStep {...{ onCopy }} />,
  },
];

export const ShareWebsiteFlyout = ({ onCopy, onExport, onClose, unsupportedRenderers }: Props) => {
  const link = (
    <EuiLink
      style={{ textDecoration: 'underline' }}
      onClick={() => {
        onExport('shareZip');
      }}
    >
      <FormattedMessage
        id="xpack.canvas.shareWebsiteFlyout.zipDownloadLinkLabel"
        defaultMessage="download an example {ZIP} file"
        values={{ ZIP }}
      />
    </EuiLink>
  );

  const title = (
    <div>
      <FormattedMessage
        id="xpack.canvas.shareWebsiteFlyout.flyoutCalloutDescription"
        defaultMessage="To try sharing, you can {link} containing this workpad, the {CANVAS} Shareable Workpad runtime, and a sample {HTML} file."
        values={{
          CANVAS,
          HTML,
          link,
        }}
      />
    </div>
  );

  let warningText = null;
  if (unsupportedRenderers.length > 0) {
    const warning = [
      <p>{strings.getUnsupportedRendererWarning()}</p>,
      unsupportedRenderers.map(fn => [<EuiCode>{fn}</EuiCode>, <EuiSpacer size="xs" />]),
      <p>{strings.getUnsupportedRendererResult()}</p>,
    ];
    warningText = [
      <EuiCallOut title={warning} color="warning" size="s" iconType="alert" />,
      <EuiSpacer />,
    ];
  }

  return (
    <EuiFlyout onClose={() => onClose('share')} maxWidth>
      <EuiFlyoutHeader hasBorder>
        <EuiTitle size="m">
          <h2 id="flyoutTitle">{strings.getTitle()}</h2>
        </EuiTitle>
      </EuiFlyoutHeader>
      <EuiFlyoutBody>
        <EuiText size="s">
          <p>{strings.getStepsDescription()}</p>
        </EuiText>
        <EuiSpacer />
        <EuiCallOut size="s" title={title} iconType="iInCircle"></EuiCallOut>
        <EuiSpacer />
        {warningText}
        <EuiSteps steps={steps(onExport, onCopy)} />
      </EuiFlyoutBody>
    </EuiFlyout>
  );
};
