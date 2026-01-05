/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { screen } from '@testing-library/react';
import { renderWithI18n } from '@kbn/test-jest-helpers';
import { PossibleDegradedFieldMitigations } from '.';

jest.mock('../../../../../hooks/use_dataset_quality_details_state', () => ({
  useDatasetQualityDetailsState: jest.fn(),
}));

jest.mock('../../../../../hooks/use_quality_issues', () => ({
  useQualityIssues: jest.fn(),
}));

jest.mock('../../../../../utils', () => ({
  useKibanaContextForPlugin: jest.fn(),
}));

import { useDatasetQualityDetailsState } from '../../../../../hooks/use_dataset_quality_details_state';
import { useQualityIssues } from '../../../../../hooks/use_quality_issues';
import { useKibanaContextForPlugin } from '../../../../../utils';

describe('PossibleDegradedFieldMitigations', () => {
  const mockUseQualityIssues = useQualityIssues as jest.Mock;
  const mockUseDatasetQualityDetailsState = useDatasetQualityDetailsState as jest.Mock;
  const mockUseKibanaContextForPlugin = useKibanaContextForPlugin as jest.Mock;

  const mockStreamsLocator = {
    getRedirectUrl: jest.fn(() => 'http://test-url'),
  };

  const mockIngestPipelineLocator = {
    useUrl: jest.fn(() => 'http://test-pipeline-url'),
  };

  const mockIndexManagementLocator = {
    getLocation: jest.fn(() => Promise.resolve({ path: '/test-path' })),
  };

  const defaultQualityIssuesData = {
    degradedFieldAnalysisFormattedResult: {
      isFieldLimitIssue: false,
      isFieldCharacterLimitIssue: false,
      isFieldMalformedIssue: false,
    },
    isAnalysisInProgress: false,
    degradedFieldAnalysis: {
      totalFieldLimit: 0,
    },
    updateNewFieldLimit: jest.fn(),
    isMitigationInProgress: false,
  };

  const defaultDetailsState = {
    integrationDetails: {
      integration: {
        areAssetsAvailable: false,
      },
    },
    view: 'dataQuality',
    datasetDetails: {
      rawName: 'test-dataset',
      name: 'test-dataset',
      type: 'logs',
    },
    loadingState: {
      integrationDetailsLoaded: true,
    },
    dataStreamSettings: {
      indexTemplate: 'test-template',
    },
  };

  const defaultKibanaContext = {
    services: {
      application: {
        navigateToApp: jest.fn(),
      },
      share: {
        url: {
          locators: {
            get: jest.fn((id: string) => {
              switch (id) {
                case 'STREAMS_APP_LOCATOR_ID':
                  return mockStreamsLocator;
                case 'INGEST_PIPELINES_APP_LOCATOR':
                  return mockIngestPipelineLocator;
                case 'INDEX_MANAGEMENT_LOCATOR_ID':
                  return mockIndexManagementLocator;
                default:
                  return undefined;
              }
            }),
          },
        },
      },
      docLinks: {
        links: {
          elasticsearch: {
            mappingSettingsLimit:
              'https://www.elastic.co/guide/elasticsearch/mapping-settings-limit',
          },
        },
      },
    },
  };

  beforeEach(() => {
    jest.clearAllMocks();
    mockUseQualityIssues.mockReturnValue(defaultQualityIssuesData);
    mockUseDatasetQualityDetailsState.mockReturnValue(defaultDetailsState);
    mockUseKibanaContextForPlugin.mockReturnValue(defaultKibanaContext);
  });

  describe('when analysis is in progress', () => {
    it('should not render mitigations', () => {
      mockUseQualityIssues.mockReturnValue({
        ...defaultQualityIssuesData,
        isAnalysisInProgress: true,
      });

      const { container } = renderWithI18n(<PossibleDegradedFieldMitigations />);

      expect(container.firstChild).toBeNull();
    });
  });

  describe('manual mitigations', () => {
    it('should render when view is dataQuality', () => {
      mockUseDatasetQualityDetailsState.mockReturnValue({
        ...defaultDetailsState,
        view: 'dataQuality',
      });

      renderWithI18n(<PossibleDegradedFieldMitigations />);

      expect(
        screen.getByTestId('datasetQualityManualMitigationsCustomComponentTemplateLink')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('datasetQualityManualMitigationsPipelineAccordion')
      ).toBeInTheDocument();
    });

    it('should render when view is classic', () => {
      mockUseDatasetQualityDetailsState.mockReturnValue({
        ...defaultDetailsState,
        view: 'classic',
      });

      renderWithI18n(<PossibleDegradedFieldMitigations />);

      expect(
        screen.getByTestId('datasetQualityManualMitigationsCustomComponentTemplateLink')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('datasetQualityManualMitigationsPipelineAccordion')
      ).toBeInTheDocument();
    });

    it('should not render when view is wired', () => {
      mockUseDatasetQualityDetailsState.mockReturnValue({
        ...defaultDetailsState,
        view: 'wired',
      });

      renderWithI18n(<PossibleDegradedFieldMitigations />);

      expect(
        screen.queryByTestId('datasetQualityManualMitigationsCustomComponentTemplateLink')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('datasetQualityManualMitigationsPipelineAccordion')
      ).not.toBeInTheDocument();
    });
  });

  describe('field limit issue', () => {
    it('should render FieldMappingLimit when isFieldLimitIssue is true', () => {
      mockUseQualityIssues.mockReturnValue({
        ...defaultQualityIssuesData,
        degradedFieldAnalysisFormattedResult: {
          isFieldLimitIssue: true,
          isFieldCharacterLimitIssue: false,
          isFieldMalformedIssue: false,
        },
        degradedFieldAnalysis: {
          totalFieldLimit: 1000,
        },
        totalFieldsLimit: 1000,
        totalFieldCount: 1200,
      });

      renderWithI18n(<PossibleDegradedFieldMitigations />);

      // Check for FieldMappingLimit component by accordion test ID
      expect(
        screen.getByTestId('datasetQualityDetailsDegradedFieldFlyoutFieldLimitMitigationAccordion')
      ).toBeInTheDocument();
    });

    it('should render field limit mitigations when integration assets are available', () => {
      mockUseQualityIssues.mockReturnValue({
        ...defaultQualityIssuesData,
        degradedFieldAnalysisFormattedResult: {
          isFieldLimitIssue: true,
          isFieldCharacterLimitIssue: false,
          isFieldMalformedIssue: false,
        },
        degradedFieldAnalysis: {
          totalFieldLimit: 1000,
        },
        totalFieldsLimit: 1000,
        totalFieldCount: 1200,
      });

      mockUseDatasetQualityDetailsState.mockReturnValue({
        ...defaultDetailsState,
        integrationDetails: {
          integration: {
            areAssetsAvailable: true,
          },
        },
      });

      renderWithI18n(<PossibleDegradedFieldMitigations />);

      expect(
        screen.getByTestId('datasetQualityDetailsDegradedFieldFlyoutFieldLimitMitigationAccordion')
      ).toBeInTheDocument();
    });

    it('should not render FieldMappingLimit when isFieldLimitIssue is false', () => {
      renderWithI18n(<PossibleDegradedFieldMitigations />);

      expect(
        screen.queryByTestId(
          'datasetQualityDetailsDegradedFieldFlyoutFieldLimitMitigationAccordion'
        )
      ).not.toBeInTheDocument();
    });
  });

  describe('field character limit issue', () => {
    it('should render FieldCharacterLimit when isFieldCharacterLimitIssue is true and view is not dataQuality', () => {
      mockUseQualityIssues.mockReturnValue({
        ...defaultQualityIssuesData,
        degradedFieldAnalysisFormattedResult: {
          isFieldLimitIssue: false,
          isFieldCharacterLimitIssue: true,
          isFieldMalformedIssue: false,
        },
      });

      mockUseDatasetQualityDetailsState.mockReturnValue({
        ...defaultDetailsState,
        view: 'wired',
      });

      renderWithI18n(<PossibleDegradedFieldMitigations />);

      // Check for FieldCharacterLimit component content (MitigationAccordion titles)
      expect(
        screen.getByTestId('datasetQualityDetailsFlyoutModifyFieldValueAccordion')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('datasetQualityDetailsFlyoutIncreaseFieldCharacterLimitAccordion')
      ).toBeInTheDocument();
    });

    it('should not render FieldCharacterLimit when view is dataQuality', () => {
      mockUseQualityIssues.mockReturnValue({
        ...defaultQualityIssuesData,
        degradedFieldAnalysisFormattedResult: {
          isFieldLimitIssue: false,
          isFieldCharacterLimitIssue: true,
          isFieldMalformedIssue: false,
        },
      });

      mockUseDatasetQualityDetailsState.mockReturnValue({
        ...defaultDetailsState,
        view: 'dataQuality',
      });

      renderWithI18n(<PossibleDegradedFieldMitigations />);

      expect(
        screen.queryByTestId('datasetQualityDetailsFlyoutModifyFieldValueAccordion')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('datasetQualityDetailsFlyoutIncreaseFieldCharacterLimitAccordion')
      ).not.toBeInTheDocument();
    });

    it('should not render FieldCharacterLimit when isFieldCharacterLimitIssue is false', () => {
      mockUseDatasetQualityDetailsState.mockReturnValue({
        ...defaultDetailsState,
        view: 'wired',
      });

      renderWithI18n(<PossibleDegradedFieldMitigations />);

      expect(
        screen.queryByTestId('datasetQualityDetailsFlyoutModifyFieldValueAccordion')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('datasetQualityDetailsFlyoutIncreaseFieldCharacterLimitAccordion')
      ).not.toBeInTheDocument();
    });
  });

  describe('field malformed issue', () => {
    it('should render FieldMalformed when isFieldMalformedIssue is true and view is not dataQuality', () => {
      mockUseQualityIssues.mockReturnValue({
        ...defaultQualityIssuesData,
        degradedFieldAnalysisFormattedResult: {
          isFieldLimitIssue: false,
          isFieldCharacterLimitIssue: false,
          isFieldMalformedIssue: true,
        },
      });

      mockUseDatasetQualityDetailsState.mockReturnValue({
        ...defaultDetailsState,
        view: 'wired',
      });

      renderWithI18n(<PossibleDegradedFieldMitigations />);

      expect(
        screen.getByTestId('datasetQualityDetailsFlyoutCreateConvertProcessorAccordion')
      ).toBeInTheDocument();
      expect(
        screen.getByTestId('datasetQualityDetailsFlyoutChangeFieldTypeInSchemaAccordion')
      ).toBeInTheDocument();
    });

    it('should not render FieldMalformed when view is dataQuality', () => {
      mockUseQualityIssues.mockReturnValue({
        ...defaultQualityIssuesData,
        degradedFieldAnalysisFormattedResult: {
          isFieldLimitIssue: false,
          isFieldCharacterLimitIssue: false,
          isFieldMalformedIssue: true,
        },
      });

      mockUseDatasetQualityDetailsState.mockReturnValue({
        ...defaultDetailsState,
        view: 'dataQuality',
      });

      renderWithI18n(<PossibleDegradedFieldMitigations />);

      expect(
        screen.queryByTestId('datasetQualityDetailsFlyoutCreateConvertProcessorAccordion')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('datasetQualityDetailsFlyoutChangeFieldTypeInSchemaAccordion')
      ).not.toBeInTheDocument();
    });

    it('should not render FieldMalformed when isFieldMalformedIssue is false', () => {
      mockUseDatasetQualityDetailsState.mockReturnValue({
        ...defaultDetailsState,
        view: 'wired',
      });

      renderWithI18n(<PossibleDegradedFieldMitigations />);

      expect(
        screen.queryByTestId('datasetQualityDetailsFlyoutCreateConvertProcessorAccordion')
      ).not.toBeInTheDocument();
      expect(
        screen.queryByTestId('datasetQualityDetailsFlyoutChangeFieldTypeInSchemaAccordion')
      ).not.toBeInTheDocument();
    });
  });
});
