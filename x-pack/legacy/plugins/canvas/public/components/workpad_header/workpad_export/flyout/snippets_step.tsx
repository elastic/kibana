/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
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

import { ComponentStrings } from '../../../../../i18n';

import { Clipboard } from '../../../clipboard';
import { OnCopyFn } from '../workpad_export';

const { ShareWebsiteSnippetsStep: strings } = ComponentStrings;

const HTML = `<!-- ${strings.getIncludeRuntimeLabel()} -->
<script src="kbnCanvas.js"></script>

<!-- ${strings.getPlaceholderLabel()} -->
<div kbn-canvas-shareable="canvas" kbn-canvas-url="workpad.json" />

<!-- ${strings.getCallRuntimeLabel()} -->
<script type="text/javascript">
  KbnCanvas.shareable();
</script>`;

export const SnippetsStep = ({ onCopy }: { onCopy: OnCopyFn }) => (
  <div>
    <EuiText size="s">
      <p>{strings.getSnippetsStepDescription()}</p>
    </EuiText>
    <EuiSpacer size="s" />
    <Clipboard
      content={HTML}
      onCopy={() => {
        onCopy('share');
      }}
    >
      <EuiCodeBlock
        className="canvasWorkpadExport__reportingConfig"
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
        <EuiCode>kbn-canvas-shareable="canvas"</EuiCode> ({strings.getRequiredLabel()})
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
