/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { ENABLE_ESQL } from '@kbn/esql-utils';
import { coreMock } from '@kbn/core/public/mocks';
import type { IStorageWrapper } from '@kbn/kibana-utils-plugin/public';
import { unifiedSearchPluginMock } from '@kbn/unified-search-plugin/public/mocks';
import { dataPluginMock } from '@kbn/data-plugin/public/mocks';
import { dataViewPluginMocks } from '@kbn/data-views-plugin/public/mocks';
import { chartPluginMock } from '@kbn/charts-plugin/public/mocks';
import { indexPatternFieldEditorPluginMock } from '@kbn/data-view-field-editor-plugin/public/mocks';
import { uiActionsPluginMock } from '@kbn/ui-actions-plugin/public/mocks';
import { fieldFormatsServiceMock } from '@kbn/field-formats-plugin/public/mocks';
import { kqlPluginMock } from '@kbn/kql/public/mocks';
import { getFormBasedDatasource } from './form_based';
import { loadInitialState } from './loader';
import { getLensFeatureFlags } from '../../get_feature_flags';

jest.mock('./loader', () => ({
  ...jest.requireActual('./loader'),
  loadInitialState: jest.fn(),
}));
jest.mock('../../get_feature_flags');

const createDatasource = ({ esqlSettingEnabled }: { esqlSettingEnabled: boolean }) => {
  const core = coreMock.createStart();
  core.uiSettings.get.mockImplementation((key: string) =>
    key === ENABLE_ESQL ? esqlSettingEnabled : undefined
  );
  return getFormBasedDatasource({
    unifiedSearch: unifiedSearchPluginMock.createStartContract(),
    kql: kqlPluginMock.createStartContract(),
    storage: {} as IStorageWrapper,
    core,
    data: dataPluginMock.createStartContract(),
    dataViews: dataViewPluginMocks.createStartContract(),
    fieldFormats: fieldFormatsServiceMock.createStartContract(),
    charts: chartPluginMock.createSetupContract(),
    dataViewFieldEditor: indexPatternFieldEditorPluginMock.createStartContract(),
    uiActions: uiActionsPluginMock.createStartContract(),
  });
};

const setEnableEsqlFlag = (enableEsql: boolean) => {
  (getLensFeatureFlags as jest.Mock).mockReturnValue({ enableEsql });
};

describe('form based datasource: ES|QL default for new charts', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  describe('#createEmptyLayer', () => {
    it('sets useEsql when the feature flag and the advanced setting are enabled', () => {
      setEnableEsqlFlag(true);
      const datasource = createDatasource({ esqlSettingEnabled: true });
      expect(datasource.createEmptyLayer('index-pattern-id')).toEqual({
        currentIndexPatternId: 'index-pattern-id',
        layers: {},
        useEsql: true,
      });
    });

    it('does not set useEsql when the feature flag is disabled', () => {
      setEnableEsqlFlag(false);
      const datasource = createDatasource({ esqlSettingEnabled: true });
      expect(datasource.createEmptyLayer('index-pattern-id')).not.toHaveProperty('useEsql');
    });

    it('does not set useEsql when the advanced setting is disabled', () => {
      setEnableEsqlFlag(true);
      const datasource = createDatasource({ esqlSettingEnabled: false });
      expect(datasource.createEmptyLayer('index-pattern-id')).not.toHaveProperty('useEsql');
    });
  });

  describe('#initialize', () => {
    it.each([
      { enableEsql: true, esqlSettingEnabled: true, expected: true },
      { enableEsql: false, esqlSettingEnabled: true, expected: false },
      { enableEsql: true, esqlSettingEnabled: false, expected: false },
    ])(
      'passes useEsqlByDefault=$expected for flag=$enableEsql, setting=$esqlSettingEnabled',
      ({ enableEsql, esqlSettingEnabled, expected }) => {
        setEnableEsqlFlag(enableEsql);
        const datasource = createDatasource({ esqlSettingEnabled });
        datasource.initialize();
        expect(loadInitialState).toHaveBeenCalledWith(
          expect.objectContaining({ useEsqlByDefault: expected })
        );
      }
    );
  });
});
