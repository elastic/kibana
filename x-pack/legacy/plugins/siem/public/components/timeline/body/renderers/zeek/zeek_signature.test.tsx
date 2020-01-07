/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { shallow } from 'enzyme';
import toJson from 'enzyme-to-json';
import { cloneDeep } from 'lodash/fp';
import React from 'react';

import { Ecs } from '../../../../../graphql/types';
import { mockTimelineData, TestProviders } from '../../../../../mock';
import { useMountAppended } from '../../../../../utils/use_mount_appended';
import {
  ZeekSignature,
  extractStateValue,
  constructDroppedValue,
  TotalVirusLinkSha,
  Link,
  DraggableZeekElement,
  sha1StringRenderer,
  md5StringRenderer,
  droppedStringRenderer,
  moduleStringRenderer,
  defaultStringRenderer,
} from './zeek_signature';

describe('ZeekSignature', () => {
  const mount = useMountAppended();
  let zeek: Ecs;

  beforeEach(() => {
    zeek = cloneDeep(mockTimelineData[13].ecs);
  });

  describe('rendering', () => {
    test('it renders the default Zeek', () => {
      const wrapper = shallow(<ZeekSignature data={zeek} timelineId="test" />);
      expect(toJson(wrapper)).toMatchSnapshot();
    });
  });

  describe('#extractStateValue', () => {
    test('it returns a valid state i18n string given a valid string', () => {
      expect(extractStateValue('S0')).toEqual('Connection attempt seen, no reply');
    });

    test('it returns null given null', () => {
      expect(extractStateValue(null)).toBeNull();
    });

    test('it returns null given an invalid string', () => {
      expect(extractStateValue('garbage')).toBeNull();
    });
  });

  describe('#constructDroppedValue', () => {
    test('it returns a valid Dropped string given a valid boolean of "true"', () => {
      expect(constructDroppedValue(true)).toEqual('true');
    });

    test('it returns a valid Dropped string given a valid boolean of "false"', () => {
      expect(constructDroppedValue(false)).toEqual('false');
    });

    test('it returns null given null', () => {
      expect(constructDroppedValue(null)).toEqual(null);
    });
  });

  describe('#TotalVirusLinkSha', () => {
    test('should return null if value is null', () => {
      const wrapper = mount(<TotalVirusLinkSha value={null} />);
      expect(
        wrapper
          .find('TotalVirusLinkSha')
          .children()
          .exists()
      ).toBeFalsy();
    });

    test('should render value', () => {
      const wrapper = mount(<TotalVirusLinkSha value={'abc'} />);
      expect(wrapper.text()).toEqual('abc');
    });

    test('should render link with sha', () => {
      const wrapper = mount(<TotalVirusLinkSha value={'abcdefg'} />);
      expect(wrapper.find('a').prop('href')).toEqual('https://www.virustotal.com/#/search/abcdefg');
    });
  });

  describe('#Link', () => {
    test('should return null if value is null', () => {
      const wrapper = mount(<Link value={null} />);
      expect(
        wrapper
          .find('Link')
          .children()
          .exists()
      ).toBeFalsy();
    });

    test('should render value', () => {
      const wrapper = mount(<Link value={'abc'} />);
      expect(wrapper.text()).toEqual('abc');
    });

    test('should render value and link', () => {
      const wrapper = mount(<Link link={'somethingelse'} value={'abcdefg'} />);
      expect(wrapper.find('a').prop('href')).toEqual(
        'https://www.google.com/search?q=somethingelse'
      );
    });
  });

  describe('DraggableZeekElement', () => {
    test('it returns null if value is null', () => {
      const wrapper = mount(
        <TestProviders>
          <DraggableZeekElement field="zeek.notice" id="id-123" value={null} />
        </TestProviders>
      );
      expect(
        wrapper
          .find('DraggableZeekElement')
          .children()
          .exists()
      ).toBeFalsy();
    });

    test('it renders the default ZeekSignature', () => {
      const wrapper = mount(
        <TestProviders>
          <DraggableZeekElement field="zeek.notice" id="id-123" value={'mynote'} />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('mynote');
    });

    test('it renders with a custom string renderer', () => {
      const wrapper = mount(
        <TestProviders>
          <DraggableZeekElement
            field="zeek.notice"
            id="id-123"
            stringRenderer={value => `->${value}<-`}
            value={'mynote'}
          />
        </TestProviders>
      );
      expect(wrapper.text()).toEqual('->mynote<-');
    });

    describe('#TagTooltip', () => {
      test('it renders the name of the field in a tooltip', () => {
        const field = 'zeek.notice';
        const wrapper = mount(
          <TestProviders>
            <DraggableZeekElement field={field} id="id-123" value={'the people you love'} />
          </TestProviders>
        );

        expect(
          wrapper
            .find('[data-test-subj="badge-tooltip"]')
            .first()
            .props().content
        ).toEqual(field);
      });
    });
  });

  describe('#sha1StringRenderer', () => {
    test('renders first 7 characters of a sha', () => {
      expect(sha1StringRenderer('12345678910')).toEqual('sha1: 1234567...');
    });

    test('renders less than 7 characters if for some reason there is bad input', () => {
      expect(sha1StringRenderer('123')).toEqual('sha1: 123...');
    });
  });

  describe('#md5StringRenderer', () => {
    test('renders first 7 characters of a md5', () => {
      expect(md5StringRenderer('12345678910')).toEqual('md5: 1234567...');
    });

    test('renders less than 7 characters if for some reason there is bad input', () => {
      expect(md5StringRenderer('123')).toEqual('md5: 123...');
    });
  });

  describe('#droppedStringRenderer', () => {
    test('renders the words Dropped:someValue', () => {
      expect(droppedStringRenderer('someValue')).toEqual('Dropped:someValue');
    });
  });

  describe('#moduleStringRenderer', () => {
    test('renders modules of zeek.connection as the string connection', () => {
      expect(moduleStringRenderer('zeek.connection')).toEqual('connection');
    });

    test('renders modules of zeek.dns as the string dns', () => {
      expect(moduleStringRenderer('zeek.dns')).toEqual('dns');
    });

    test('renders modules of zeek.http as the string http', () => {
      expect(moduleStringRenderer('zeek.http')).toEqual('http');
    });

    test('renders modules of zeek.files as the string files', () => {
      expect(moduleStringRenderer('zeek.files')).toEqual('files');
    });

    test('renders modules of zeek.notice as the string notice', () => {
      expect(moduleStringRenderer('zeek.notice')).toEqual('notice');
    });

    test('renders modules of zeek.ssl as the string ssl', () => {
      expect(moduleStringRenderer('zeek.ssl')).toEqual('ssl');
    });

    test('renders modules of bad input as that module name', () => {
      expect(moduleStringRenderer('ssl')).toEqual('ssl');
    });

    test('renders modules of bad input with multiple dots as only the second value', () => {
      expect(moduleStringRenderer('abc.def.ghi')).toEqual('def');
    });

    test('renders modules of bad input with single dot as that value (but with the dot)', () => {
      expect(moduleStringRenderer('abc.')).toEqual('abc');
    });
  });

  describe('#defaultStringRenderer', () => {
    test('renders default string', () => {
      expect(defaultStringRenderer('identity')).toEqual('identity');
    });
  });
});
