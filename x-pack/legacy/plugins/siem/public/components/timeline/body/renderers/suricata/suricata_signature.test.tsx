/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import React from 'react';

import { TestProviders } from '../../../../../mock';
import { useMountAppended } from '../../../../../utils/use_mount_appended';
import {
  SuricataSignature,
  Tokens,
  DraggableSignatureId,
  SURICATA_SIGNATURE_ID_FIELD_NAME,
} from './suricata_signature';

describe('SuricataSignature', () => {
  const mount = useMountAppended();

  describe('rendering', () => {
    test('it renders the default SuricataSignature', () => {
      const wrapper = shallow(
        <SuricataSignature
          contextId="test"
          id="doc-id-123"
          signature="ET SCAN ATTACK Hello"
          signatureId={123}
        />
      );
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('Tokens', () => {
    test('should render empty if tokens are empty', () => {
      const wrapper = shallow(<Tokens tokens={[]} />);
      expect(wrapper.children().length).toEqual(0);
    });

    test('should render a single if it is present', () => {
      const wrapper = mount(
        <div>
          <Tokens tokens={['ET']} />
        </div>
      );
      expect(wrapper.text()).toEqual('ET');
    });

    test('should render the multiple tokens if they are present', () => {
      const wrapper = mount(
        <div>
          <Tokens tokens={['ET', 'SCAN']} />
        </div>
      );
      expect(wrapper.text()).toEqual('ETSCAN');
    });
  });

  describe('DraggableSignatureId', () => {
    test('it renders the default SuricataSignature', () => {
      const wrapper = mount(
        <TestProviders>
          <DraggableSignatureId id="id-123" signatureId={123} />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('123');
    });

    test('it renders a tooltip for the signature field', () => {
      const wrapper = mount(
        <TestProviders>
          <DraggableSignatureId id="id-123" signatureId={123} />
        </TestProviders>
      );

      expect(
        wrapper
          .find('[data-test-subj="signature-id-tooltip"]')
          .first()
          .props().content
      ).toEqual(SURICATA_SIGNATURE_ID_FIELD_NAME);
    });
  });
});
