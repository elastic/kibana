/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useState } from 'react';
import { EuiPopover, EuiExpression } from '@elastic/eui';
import { i18n } from '@kbn/i18n';

interface ExpressionPreviewProps {
  previewText: string;
  renderPopup: () => React.Component;
  popOverId: string;
}

export function ExpressionPreview(props: ExpressionPreviewProps) {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <EuiPopover
      id={props.popOverId}
      isOpen={isPopoverOpen}
      closePopover={() => {
        setIsPopoverOpen(false);
      }}
      ownFocus
      initialFocus="body" /* avoid initialFocus on Combobox */
      anchorPosition="leftCenter"
      button={
        <EuiExpression
          onClick={() => {
            setIsPopoverOpen(!isPopoverOpen);
          }}
          description={i18n.translate('xpack.maps.termJoinExpression.description', {
            defaultMessage: 'Join with',
          })}
          uppercase={false}
          value={props.previewText}
        />
      }
      repositionOnScroll={true}
    >
      {props.renderPopup()}
    </EuiPopover>
  );
}
