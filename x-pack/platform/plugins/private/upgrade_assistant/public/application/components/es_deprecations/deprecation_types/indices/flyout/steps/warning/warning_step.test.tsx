/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { I18nProvider } from '@kbn/i18n-react';
import { mount, shallow } from 'enzyme';
import React from 'react';
import SemVer from 'semver/classes/semver';

import { idForWarning, WarningFlyoutStep } from './warning_step';
import {
  EnrichedDeprecationInfo,
  IndexWarning,
  ReindexAction,
} from '../../../../../../../../../common/types';
import { ReindexState } from '../../../use_reindex';
import { LoadingState } from '../../../../../../types';

const kibanaVersion = new SemVer('8.0.0');

jest.mock('../../../../../../../app_context', () => {
  const { docLinksServiceMock } = jest.requireActual('@kbn/core-doc-links-browser-mocks');

  return {
    useAppContext: () => {
      return {
        services: {
          core: {
            docLinks: docLinksServiceMock.createStartContract(),
          },
          api: {
            useLoadNodeDiskSpace: jest.fn(() => ({ data: [] })),
          },
        },
      };
    },
  };
});

describe('WarningFlyoutStep', () => {
  const meta = {
    indexName: 'foo',
    reindexName: 'reindexed-foo',
    aliases: [],
    isInDataStream: false,
    isFrozen: false,
    isReadonly: false,
    isClosedIndex: false,
    isFollowerIndex: false,
  };
  const defaultProps = {
    warnings: [] as IndexWarning[],
    closeFlyout: jest.fn(),
    confirm: jest.fn(),
    flow: 'reindex' as const,
    meta,
    reindexState: {
      loadingState: LoadingState.Success,
      meta,
      hasRequiredPrivileges: true,
      reindexTaskPercComplete: null,
      errorMessage: null,
    } as ReindexState,
    deprecation: {
      index: 'foo',
      correctiveAction: {
        type: 'reindex',
      } as ReindexAction,
      level: 'critical',
      message: 'foo',
      resolveDuringUpgrade: false,
      type: 'index_settings',
    } as EnrichedDeprecationInfo,
  };

  it('renders', () => {
    expect(shallow(<WarningFlyoutStep {...defaultProps} />)).toMatchSnapshot();
  });

  if (kibanaVersion.major === 7) {
    it('does not allow proceeding until all are checked', () => {
      const defaultPropsWithWarnings = {
        ...defaultProps,
        warnings: [
          {
            flow: 'all' as const,
            warningType: 'indexSetting',
            meta: {
              deprecatedSettings: ['index.force_memory_term_dictionary'],
            },
          },
        ] as IndexWarning[],
      };
      const wrapper = mount(
        <I18nProvider>
          <WarningFlyoutStep {...defaultPropsWithWarnings} />
        </I18nProvider>
      );
      const button = wrapper.find('EuiButton');

      button.simulate('click');
      expect(defaultPropsWithWarnings.confirm).not.toHaveBeenCalled();

      // first warning (indexSetting)
      wrapper.find(`input#${idForWarning(1)}`).simulate('change');
      button.simulate('click');

      expect(defaultPropsWithWarnings.confirm).toHaveBeenCalled();
    });
  }
});
