/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import {
  EuiButton,
  EuiCodeBlock,
  EuiDescriptionList,
  EuiIconTip,
  EuiModal,
  EuiModalBody,
  EuiModalHeader,
  EuiModalHeaderTitle,
  EuiModalFooter,
  EuiOverlayMask,
  EuiSpacer,
  EuiTabbedContent,
} from '@elastic/eui';
import numeral from '@elastic/numeral';
import { getOr } from 'lodash/fp';
import React, { ReactNode } from 'react';
import styled from 'styled-components';

import * as i18n from './translations';

const DescriptionListStyled = styled(EuiDescriptionList)`
  ${({ theme }) => `
    dt {
      font-size: ${getOr('12px', 'eui.euiFontSizeXS', theme)} !important;
    }
    dt .euiToolTipAnchor {
      vertical-align: text-bottom;
      padding-right: 5px;
    }
  `}
`;

interface ModalInspectProps {
  closeModal: () => void;
  isShowing: boolean;
  request: string | null;
  response: string | null;
  title: string | React.ReactElement | React.ReactNode;
}

interface Request {
  index: string[];
  allowNoIndices: boolean;
  ignoreUnavailable: boolean;
  body: Record<string, unknown>;
}

interface Response {
  took: number;
  timed_out: boolean;
  _shards: Record<string, unknown>;
  hits: Record<string, unknown>;
  aggregations: Record<string, unknown>;
}

const MyEuiModal = styled(EuiModal)`
  .euiModal__flex {
    width: 60vw;
  }
  .euiCodeBlock {
    height: auto !important;
    max-width: 718px;
  }
`;

const parseRequest = (objectStringify: string): Request | null => {
  try {
    return JSON.parse(objectStringify);
  } catch {
    return null;
  }
};

const parseResponse = (objectStringify: string): Response | null => {
  try {
    return JSON.parse(objectStringify);
  } catch {
    return null;
  }
};

const manageStringify = (object: Record<string, unknown> | Response): string => {
  try {
    return JSON.stringify(object, null, 2);
  } catch {
    return i18n.SOMETHING_WENT_WRONG;
  }
};

export const ModalInspectQuery = ({
  closeModal,
  isShowing = false,
  request,
  response,
  title,
}: ModalInspectProps) => {
  if (!isShowing || request == null || response == null) {
    return null;
  }
  const inspectRequest: Request | null = parseRequest(request);
  const inspectResponse: Response | null = parseResponse(response);
  const statistics: Array<{
    title: NonNullable<ReactNode | string>;
    description: NonNullable<ReactNode | string>;
  }> = [
    {
      title: (
        <>
          <EuiIconTip content={i18n.INDEX_PATTERN_DESC} position="top" />
          {i18n.INDEX_PATTERN}
        </>
      ),
      description:
        inspectRequest != null ? inspectRequest.index.join(', ') : i18n.SOMETHING_WENT_WRONG,
    },

    {
      title: (
        <>
          <EuiIconTip content={i18n.QUERY_TIME_DESC} position="top" />
          {i18n.QUERY_TIME}
        </>
      ),
      description:
        inspectResponse != null
          ? `${numeral(inspectResponse.took).format('0,0')}ms`
          : i18n.SOMETHING_WENT_WRONG,
    },
    {
      title: (
        <>
          <EuiIconTip content={i18n.REQUEST_TIMESTAMP_DESC} position="top" />
          {i18n.REQUEST_TIMESTAMP}
        </>
      ),
      description: new Date().toISOString(),
    },
  ];

  const tabs = [
    {
      id: 'statistics',
      name: 'Statistics',
      content: (
        <>
          <EuiSpacer />
          <DescriptionListStyled listItems={statistics} type="column" />
        </>
      ),
    },
    {
      id: 'request',
      name: 'Request',
      content: (
        <>
          <EuiSpacer />
          <EuiCodeBlock
            language="js"
            fontSize="m"
            paddingSize="m"
            color="dark"
            overflowHeight={300}
            isCopyable
          >
            {inspectRequest != null
              ? manageStringify(inspectRequest.body)
              : i18n.SOMETHING_WENT_WRONG}
          </EuiCodeBlock>
        </>
      ),
    },
    {
      id: 'response',
      name: 'Response',
      content: (
        <>
          <EuiSpacer />
          <EuiCodeBlock
            language="js"
            fontSize="m"
            paddingSize="m"
            color="dark"
            overflowHeight={300}
            isCopyable
          >
            {response}
          </EuiCodeBlock>
        </>
      ),
    },
  ];

  return (
    <EuiOverlayMask>
      <MyEuiModal onClose={closeModal} data-test-subj="modal-inspect-euiModal">
        <EuiModalHeader>
          <EuiModalHeaderTitle>
            {i18n.INSPECT} {title}
          </EuiModalHeaderTitle>
        </EuiModalHeader>

        <EuiModalBody>
          <EuiTabbedContent tabs={tabs} initialSelectedTab={tabs[0]} autoFocus="selected" />
        </EuiModalBody>

        <EuiModalFooter>
          <EuiButton onClick={closeModal} fill data-test-subj="modal-inspect-close">
            {i18n.CLOSE}
          </EuiButton>
        </EuiModalFooter>
      </MyEuiModal>
    </EuiOverlayMask>
  );
};
