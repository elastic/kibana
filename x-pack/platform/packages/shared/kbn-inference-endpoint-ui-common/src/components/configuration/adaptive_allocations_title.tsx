/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { FC, useState } from 'react';
import {
  EuiButtonIcon,
  EuiFlexGroup,
  EuiFlexItem,
  EuiPopover,
  EuiPopoverTitle,
  EuiSpacer,
  EuiTitle,
  EuiText,
} from '@elastic/eui';
import { FormattedMessage } from '@kbn/i18n-react';
import { i18n } from '@kbn/i18n';

export const AdaptiveAllocationsTitle: FC = () => {
  const [isPopoverOpen, setIsPopoverOpen] = useState(false);

  return (
    <>
      <EuiFlexGroup alignItems="center" gutterSize="none">
        <EuiFlexItem grow={false}>
          <EuiTitle size="xxs" data-test-subj="maxNumberOfAllocationsDetailsLabel">
            <h5>
              <FormattedMessage
                id="xpack.inferenceEndpointUICommon.components.adaptiveResourcesTitle"
                defaultMessage="Adaptive resources"
              />
            </h5>
          </EuiTitle>
        </EuiFlexItem>
        <EuiFlexItem grow={false}>
          <EuiPopover
            anchorPosition="upCenter"
            button={
              <EuiButtonIcon
                color="text"
                size="xs"
                onClick={() => setIsPopoverOpen(!isPopoverOpen)}
                iconType="info"
                aria-label={i18n.translate(
                  'xpack.inferenceEndpointUICommon.components.adaptiveResourcesAriaLabel',
                  {
                    defaultMessage: 'Open adaptive resources information popover',
                  }
                )}
              />
            }
            isOpen={isPopoverOpen}
            closePopover={() => setIsPopoverOpen(false)}
          >
            <EuiPopoverTitle>
              <FormattedMessage
                id="xpack.inferenceEndpointUICommon.components.sectionPopoverTitle"
                defaultMessage="Adaptive resources"
              />
            </EuiPopoverTitle>
            <div style={{ width: '300px' }}>
              <EuiText size="s">
                <p>
                  <FormattedMessage
                    id="xpack.inferenceEndpointUICommon.components.sectionPopoverFirstParagraph"
                    defaultMessage="The number of allocations scales automatically, based on load. Resources scale up when the load increases and scale down when the load decreases. We scale down to 0 <bold>after 24 hours of no inference calls</bold> to the endpoint to <bold>optimize cost and performance</bold>."
                    values={{
                      bold: (str) => <strong>{str}</strong>,
                    }}
                  />
                </p>
                <p>
                  <FormattedMessage
                    id="xpack.inferenceEndpointUICommon.components.sectionPopoverSecondParagraph"
                    defaultMessage="Subsequent inference calls may return errors for a few second, until resources are available again to service inference requests."
                  />
                </p>
                <p>
                  <FormattedMessage
                    id="xpack.inferenceEndpointUICommon.components.sectionPopoverThirdParagraph"
                    defaultMessage="You can optionally set the maximum number of allocations. Autoscaling will occur dynamically between zero and maximum available or the user set maximum."
                  />
                </p>
              </EuiText>
            </div>
          </EuiPopover>
        </EuiFlexItem>
      </EuiFlexGroup>
      <EuiText color="subdued" size="xs">
        <FormattedMessage
          id="xpack.inferenceEndpointUICommon.components.adaptiveResourcesDescription"
          defaultMessage="The number of allocations scales automatically, based on load."
        />
      </EuiText>
      <EuiSpacer size="m" />
    </>
  );
};
