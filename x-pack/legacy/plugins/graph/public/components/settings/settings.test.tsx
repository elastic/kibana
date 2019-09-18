/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import React from 'react';
import { EuiTab, EuiListGroupItem, EuiButton, EuiAccordion, EuiFieldText } from '@elastic/eui';
import * as Rx from 'rxjs';
import { mountWithIntl } from 'test_utils/enzyme_helpers';
import { Settings, SettingsProps } from './settings';
import { act } from 'react-testing-library';
import { ReactWrapper } from 'enzyme';
import { UrlTemplateForm } from './url_template_form';

describe('settings', () => {
  const props: jest.Mocked<SettingsProps> = {
    advancedSettings: {
      maxValuesPerDoc: 5,
      minDocCount: 10,
      sampleSize: 12,
      useSignificance: true,
      timeoutMillis: 10000,
    },
    updateAdvancedSettings: jest.fn(),
    blacklistedNodes: [
      {
        x: 0,
        y: 0,
        scaledSize: 10,
        parent: null,
        color: 'black',
        data: {
          field: 'A',
          term: '1',
        },
        label: 'blacklisted node 1',
        icon: {
          class: 'test',
          code: '1',
          label: 'test',
        },
      },
      {
        x: 0,
        y: 0,
        scaledSize: 10,
        parent: null,
        color: 'black',
        data: {
          field: 'A',
          term: '1',
        },
        label: 'blacklisted node 2',
        icon: {
          class: 'test',
          code: '1',
          label: 'test',
        },
      },
    ],
    unblacklistNode: jest.fn(),
    urlTemplates: [
      {
        description: 'template',
        encoder: {
          description: 'test encoder description',
          encode: jest.fn(),
          id: 'test',
          title: 'test encoder',
          type: 'esq',
        },
        url: 'http://example.org',
        icon: {
          class: 'test',
          code: '1',
          label: 'test',
        },
      },
    ],
    removeUrlTemplate: jest.fn(),
    saveUrlTemplate: jest.fn(),
    allFields: [
      {
        selected: false,
        color: 'black',
        name: 'B',
        icon: {
          class: 'test',
          code: '1',
          label: 'test',
        },
      },
      {
        selected: false,
        color: 'red',
        name: 'C',
        icon: {
          class: 'test',
          code: '1',
          label: 'test',
        },
      },
    ],
    canEditDrillDownUrls: true,
  };

  let subject: Rx.BehaviorSubject<jest.Mocked<SettingsProps>>;
  let instance: ReactWrapper;

  beforeEach(() => {
    subject = new Rx.BehaviorSubject(props);
    instance = mountWithIntl(<Settings observable={subject.asObservable()} />);
  });

  function toTab(tab: string) {
    act(() => {
      instance
        .find(EuiTab)
        .findWhere(node => node.key() === tab)
        .prop('onClick')!({});
    });
    instance.update();
  }

  function input(label: string) {
    return instance.find({ label }).find('input');
  }

  describe('advanced settings', () => {
    it('should display advanced settings', () => {
      expect(input('Sample size').prop('value')).toEqual(12);
    });

    it('should set advanced settings', () => {
      input('Sample size').prop('onChange')!({ target: { valueAsNumber: 13 } } as React.ChangeEvent<
        HTMLInputElement
      >);

      expect(props.updateAdvancedSettings).toHaveBeenCalledWith(
        expect.objectContaining({ sampleSize: 13 })
      );
    });

    it('should update on new data', () => {
      act(() => {
        subject.next({
          ...props,
          advancedSettings: {
            ...props.advancedSettings,
            sampleSize: 13,
          },
        });
      });

      instance.update();

      expect(input('Sample size').prop('value')).toEqual(13);
    });
  });

  describe('blacklist', () => {
    beforeEach(() => {
      toTab('Blacklist');
    });

    it('should switch tab to blacklist', () => {
      expect(instance.find(EuiListGroupItem).map(item => item.prop('label'))).toEqual([
        'blacklisted node 1',
        'blacklisted node 2',
      ]);
    });

    it('should delete node', () => {
      instance
        .find(EuiListGroupItem)
        .at(0)
        .prop('extraAction')!.onClick!({} as any);

      expect(props.unblacklistNode).toHaveBeenCalledWith(props.blacklistedNodes![0]);
    });

    it('should delete all nodes', () => {
      instance
        .find('[data-test-subj="graphUnblacklistAll"]')
        .find(EuiButton)
        .simulate('click');

      expect(props.unblacklistNode).toHaveBeenCalledWith(props.blacklistedNodes![0]);
      expect(props.unblacklistNode).toHaveBeenCalledWith(props.blacklistedNodes![1]);
    });
  });

  describe('url templates', () => {
    function templateForm(index: number) {
      return instance.find(UrlTemplateForm).at(index);
    }

    function insert(formIndex: number, label: string, value: string) {
      act(() => {
        templateForm(formIndex)
          .find({ label })
          .first()
          .find(EuiFieldText)
          .prop('onChange')!({ target: { value } } as React.ChangeEvent<HTMLInputElement>);
      });
      instance.update();
    }

    beforeEach(() => {
      toTab('Drill-downs');
    });

    it('should switch tab to url templates', () => {
      expect(
        instance
          .find(EuiAccordion)
          .at(0)
          .prop('buttonContent')
      ).toEqual('template');
    });

    it('should delete url template', () => {
      templateForm(0)
        .find('EuiButtonEmpty[data-test-subj="graphRemoveUrlTemplate"]')
        .simulate('click');
      expect(props.removeUrlTemplate).toHaveBeenCalledWith(props.urlTemplates[0]);
    });

    it('should update url template', () => {
      insert(0, 'Title', 'Updated title');
      act(() => {
        templateForm(0)
          .find('form')
          .simulate('submit');
      });
      expect(props.saveUrlTemplate).toHaveBeenCalledWith(0, {
        ...props.urlTemplates[0],
        description: 'Updated title',
      });
    });

    it('should add url template', async () => {
      act(() => {
        instance.find('EuiButton[data-test-subj="graphAddNewTemplate"]').simulate('click');
      });
      instance.update();

      insert(1, 'URL', 'test-url');
      insert(1, 'Title', 'Title');

      act(() => {
        templateForm(1)
          .find('form')
          .simulate('submit');
      });
      expect(props.saveUrlTemplate).toHaveBeenCalledWith(
        -1,
        expect.objectContaining({ description: 'Title', url: 'test-url' })
      );
    });
  });
});
