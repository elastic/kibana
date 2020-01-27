/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import * as React from 'react';

import { TestProviders } from '../../mock';
import { useMountAppended } from '../../utils/use_mount_appended';

import { CertificateFingerprint } from '.';

describe('CertificateFingerprint', () => {
  const mount = useMountAppended();
  test('renders the expected label', () => {
    const wrapper = mount(
      <TestProviders>
        <CertificateFingerprint
          eventId="Tgwnt2kBqd-n62SwPZDP"
          certificateType="client"
          contextId="test"
          fieldName="tls.client_certificate.fingerprint.sha1"
          value="3f4c57934e089f02ae7511200aee2d7e7aabd272"
        />
      </TestProviders>
    );
    expect(
      wrapper
        .find('[data-test-subj="fingerprint-label"]')
        .first()
        .text()
    ).toEqual('client cert');
  });

  test('renders the fingerprint as text', () => {
    const wrapper = mount(
      <TestProviders>
        <CertificateFingerprint
          eventId="Tgwnt2kBqd-n62SwPZDP"
          certificateType="client"
          contextId="test"
          fieldName="tls.client_certificate.fingerprint.sha1"
          value="3f4c57934e089f02ae7511200aee2d7e7aabd272"
        />
      </TestProviders>
    );
    expect(
      wrapper
        .find('[data-test-subj="certificate-fingerprint-link"]')
        .first()
        .text()
    ).toEqual('3f4c57934e089f02ae7511200aee2d7e7aabd272');
  });

  test('it renders a hyperlink to an external site to compare the fingerprint against a known set of signatures', () => {
    const wrapper = mount(
      <TestProviders>
        <CertificateFingerprint
          eventId="Tgwnt2kBqd-n62SwPZDP"
          certificateType="client"
          contextId="test"
          fieldName="tls.client_certificate.fingerprint.sha1"
          value="3f4c57934e089f02ae7511200aee2d7e7aabd272"
        />
      </TestProviders>
    );

    expect(
      wrapper
        .find('[data-test-subj="certificate-fingerprint-link"]')
        .first()
        .props().href
    ).toEqual(
      'https://sslbl.abuse.ch/ssl-certificates/sha1/3f4c57934e089f02ae7511200aee2d7e7aabd272'
    );
  });
});
