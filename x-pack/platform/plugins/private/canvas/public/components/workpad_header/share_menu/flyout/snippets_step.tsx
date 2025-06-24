/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC } from 'react';
import {
  EuiText,
  EuiSpacer,
  EuiCode,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiDescriptionListTitle,
  EuiDescriptionListDescription,
  EuiHorizontalRule,
} from '@elastic/eui';
import { i18n } from '@kbn/i18n';

import { CANVAS, URL, JSON } from '../../../../../i18n/constants';

import { Clipboard } from '../../../clipboard';
import { OnCopyFn } from './flyout';

const strings = {
  getAutoplayParameterDescription: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.autoplayParameterDescription', {
      defaultMessage: 'Should the runtime automatically move through the pages of the workpad?',
    }),
  getCallRuntimeLabel: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.callRuntimeLabel', {
      defaultMessage: 'Call Runtime',
    }),
  getHeightParameterDescription: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.heightParameterDescription', {
      defaultMessage: 'The height of the Workpad. Defaults to the Workpad height.',
    }),
  getIncludeRuntimeLabel: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.includeRuntimeLabel', {
      defaultMessage: 'Include Runtime',
    }),
  getIntervalParameterDescription: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.intervalParameterDescription', {
      defaultMessage:
        'The interval upon which the pages will advance in time format, (e.g. {twoSeconds}, {oneMinute})',
      values: {
        twoSeconds: '2s',
        oneMinute: '1m',
      },
    }),
  getPageParameterDescription: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.pageParameterDescription', {
      defaultMessage: 'The page to display. Defaults to the page specified by the Workpad.',
    }),
  getParametersDescription: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.parametersDescription', {
      defaultMessage: 'There are a number of inline parameters to configure the Shareable Workpad.',
    }),
  getParametersTitle: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.parametersLabel', {
      defaultMessage: 'Parameters',
    }),
  getPlaceholderLabel: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.placeholderLabel', {
      defaultMessage: 'Placeholder',
    }),
  getRequiredLabel: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.requiredLabel', {
      defaultMessage: 'required',
    }),
  getShareableParameterDescription: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.shareableParameterDescription', {
      defaultMessage: 'The type of shareable. In this case, a {CANVAS} Workpad.',
      values: {
        CANVAS,
      },
    }),
  getSnippetsStepDescription: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.description', {
      defaultMessage:
        'The Workpad is placed within the {HTML} of the site by using an {HTML} placeholder. Parameters for the runtime are included inline. See the full list of parameters below. You can include more than one workpad on the page.',
      values: {
        HTML,
      },
    }),
  getToolbarParameterDescription: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.toolbarParameterDescription', {
      defaultMessage: 'Should the toolbar be hidden?',
    }),
  getUrlParameterDescription: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.urlParameterDescription', {
      defaultMessage: 'The {URL} of the Shareable Workpad {JSON} file.',
      values: {
        URL,
        JSON,
      },
    }),
  getWidthParameterDescription: () =>
    i18n.translate('xpack.canvas.shareWebsiteFlyout.snippetsStep.widthParameterDescription', {
      defaultMessage: 'The width of the Workpad. Defaults to the Workpad width.',
    }),
};

const HTML = `<!-- ${strings.getIncludeRuntimeLabel()} -->
<script src="kbn_canvas.js"></script>

<!-- ${strings.getPlaceholderLabel()} -->
<div kbn-canvas-shareable="canvas" kbn-canvas-url="workpad.json" />

<!-- ${strings.getCallRuntimeLabel()} -->
<script type="text/javascript">
  KbnCanvas.share();
</script>`;

export const SnippetsStep: FC<{ onCopy: OnCopyFn }> = ({ onCopy }) => (
  <div>
    <EuiText size="s">
      <p>{strings.getSnippetsStepDescription()}</p>
    </EuiText>
    <EuiSpacer size="s" />
    <Clipboard content={HTML} onCopy={onCopy}>
      <EuiCodeBlock
        className="canvasShareMenu__reportingConfig"
        paddingSize="s"
        fontSize="s"
        language="html"
      >
        {HTML}
      </EuiCodeBlock>
    </Clipboard>
    <EuiSpacer />
    <EuiText>
      <h4>{strings.getParametersTitle()}</h4>
      <p>{strings.getParametersDescription()}</p>
    </EuiText>
    <EuiHorizontalRule />
    <EuiDescriptionList>
      <EuiDescriptionListTitle>
        <EuiCode>kbn-canvas-shareable=&quot;canvas&quot;</EuiCode> ({strings.getRequiredLabel()})
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        {strings.getShareableParameterDescription()}
      </EuiDescriptionListDescription>
      <EuiDescriptionListTitle>
        <EuiCode>kbn-canvas-url</EuiCode> ({strings.getRequiredLabel()})
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        {strings.getUrlParameterDescription()}
      </EuiDescriptionListDescription>
      <EuiDescriptionListTitle>
        <EuiCode>kbn-canvas-height</EuiCode>
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        {strings.getHeightParameterDescription()}
      </EuiDescriptionListDescription>
      <EuiDescriptionListTitle>
        <EuiCode>kbn-canvas-width</EuiCode>
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        {strings.getWidthParameterDescription()}
      </EuiDescriptionListDescription>
      <EuiDescriptionListTitle>
        <EuiCode>kbn-canvas-page</EuiCode>
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        {strings.getPageParameterDescription()}
      </EuiDescriptionListDescription>
      <EuiDescriptionListTitle>
        <EuiCode>kbn-canvas-autoplay</EuiCode>
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        {strings.getAutoplayParameterDescription()}
      </EuiDescriptionListDescription>
      <EuiDescriptionListTitle>
        <EuiCode>kbn-canvas-interval</EuiCode>
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        {strings.getIntervalParameterDescription()}
      </EuiDescriptionListDescription>
      <EuiDescriptionListTitle>
        <EuiCode>kbn-canvas-toolbar</EuiCode>
      </EuiDescriptionListTitle>
      <EuiDescriptionListDescription>
        {strings.getToolbarParameterDescription()}
      </EuiDescriptionListDescription>
    </EuiDescriptionList>
  </div>
);
