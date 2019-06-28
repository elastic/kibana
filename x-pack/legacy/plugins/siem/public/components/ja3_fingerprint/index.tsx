/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';
import { pure } from 'recompose';
import styled from 'styled-components';

import { DraggableBadge } from '../draggables';
import { ExternalLinkIcon } from '../external_link_icon';
import { Ja3FingerprintLink } from '../links';

import * as i18n from './translations';

export const JA3_HASH_FIELD_NAME = 'tls.fingerprints.ja3.hash';

const Ja3FingerprintLabel = styled.span`
  margin-right: 5px;
`;

/**
 * Renders a ja3 fingerprint, which enables (some) clients and servers communicating
 * using TLS traffic to be identified, which is possible because SSL
 * negotiations happen in the clear
 */
export const Ja3Fingerprint = pure<{
  eventId: string;
  contextId: string;
  fieldName: string;
  value?: string | null;
}>(({ contextId, eventId, fieldName, value }) => (
  <DraggableBadge
    contextId={contextId}
    data-test-subj="ja3-hash"
    eventId={eventId}
    field={fieldName}
    iconType="snowflake"
    value={value}
  >
    <Ja3FingerprintLabel data-test-subj="ja3-fingerprint-label">
      {i18n.JA3_FINGERPRINT_LABEL}
    </Ja3FingerprintLabel>
    <Ja3FingerprintLink data-test-subj="ja3-hash-link" ja3Fingerprint={value || ''} />
    <ExternalLinkIcon />
  </DraggableBadge>
));
