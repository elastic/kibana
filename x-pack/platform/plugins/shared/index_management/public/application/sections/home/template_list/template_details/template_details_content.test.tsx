/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import { METRIC_TYPE } from '@kbn/analytics';

import type { TemplateDeserialized } from '../../../../../../common';
import {
  UIM_TEMPLATE_DETAIL_PANEL_MAPPINGS_TAB,
  UIM_TEMPLATE_DETAIL_PANEL_SUMMARY_TAB,
} from '../../../../../../common/constants';
import { useLoadIndexTemplate } from '../../../../services/api';
import { TemplateDetailsContent } from './template_details_content';
import type { UseRequestResponse, Error as EsUiSharedError } from '../../../../../shared_imports';

jest.mock('../../../../services/api', () => ({
  useLoadIndexTemplate: jest.fn(),
}));

jest.mock('../../../../app_context', () => ({
  useServices: jest.fn(),
  useAppContext: jest.fn(),
}));

jest.mock('@kbn/i18n-react', () => ({
  FormattedMessage: ({ defaultMessage }: { defaultMessage: string }) => (
    <span>{defaultMessage}</span>
  ),
}));

jest.mock('../../../../../shared_imports', () => {
  const actual = jest.requireActual('../../../../../shared_imports');
  return {
    ...actual,
    SectionLoading: ({ children }: { children: React.ReactNode }) => (
      <div data-test-subj="sectionLoading">{children}</div>
    ),
  };
});

jest.mock('../../../../components', () => ({
  TemplateDeleteModal: ({ templatesToDelete }: { templatesToDelete: Array<{ name: string }> }) =>
    templatesToDelete?.length ? (
      <div
        data-test-subj="templateDeleteModal"
        data-template-names={templatesToDelete.map((t) => t.name).join(',')}
      />
    ) : null,
  SectionError: ({ 'data-test-subj': dataTestSubj }: { 'data-test-subj'?: string }) => (
    <div data-test-subj={dataTestSubj ?? 'sectionError'} />
  ),
}));

jest.mock('../../../../components/shared', () => ({
  TabAliases: () => <div data-test-subj="tabAliasesPanel" />,
  TabMappings: () => <div data-test-subj="tabMappingsPanel" />,
  TabSettings: () => <div data-test-subj="tabSettingsPanel" />,
}));

jest.mock('../components', () => ({
  TemplateTypeIndicator: ({ templateType }: { templateType: string }) => (
    <span data-test-subj={`templateType-${templateType}`} />
  ),
  TemplateDeprecatedBadge: () => <span data-test-subj="templateDeprecatedBadge" />,
}));

jest.mock('./tabs', () => ({
  TabSummary: () => <div data-test-subj="tabSummaryPanel" />,
  TabPreview: () => <div data-test-subj="tabPreviewPanel" />,
}));

jest.mock('@elastic/eui', () => {
  const actual = jest.requireActual('@elastic/eui');
  return {
    ...actual,
    EuiPopover: ({
      button,
      children,
      isOpen,
    }: {
      button: React.ReactNode;
      children: React.ReactNode;
      isOpen: boolean;
    }) => (
      <div data-test-subj="euiPopoverWrapper">
        {button}
        {isOpen ? <div data-test-subj="popoverPanel">{children}</div> : null}
      </div>
    ),
    EuiContextMenu: ({
      panels,
    }: {
      panels: Array<{
        items: Array<{
          name: string;
          onClick: () => void;
          disabled?: boolean;
          'data-test-subj'?: string;
        }>;
      }>;
    }) => (
      <div data-test-subj="euiContextMenu">
        {panels?.[0]?.items?.map((item) => (
          <button
            key={item.name}
            type="button"
            data-test-subj={item['data-test-subj']}
            disabled={item.disabled}
            onClick={item.onClick}
          >
            {item.name}
          </button>
        ))}
      </div>
    ),
    EuiButton: ({
      children,
      iconType: _i,
      fill: _f,
      iconSide: _s,
      ...props
    }: Record<string, unknown>) => (
      <button type="button" {...props}>
        {children as React.ReactNode}
      </button>
    ),
    EuiButtonEmpty: ({ children, iconType: _i, flush: _fl, ...props }: Record<string, unknown>) => (
      <button type="button" {...props}>
        {children as React.ReactNode}
      </button>
    ),
  };
});

import { useAppContext, useServices } from '../../../../app_context';

const mockTrackMetric = jest.fn();

const createRequestError = (message: string): EsUiSharedError => ({ error: message, message });

const getUseRequestMock = ({
  isInitialRequest = false,
  isLoading,
  error,
  data,
}: {
  isInitialRequest?: boolean;
  isLoading: boolean;
  error: EsUiSharedError | null;
  data: TemplateDeserialized | null;
}): UseRequestResponse<TemplateDeserialized, EsUiSharedError> => ({
  isInitialRequest,
  isLoading,
  error,
  data,
  resendRequest: jest.fn(),
});

const makeTemplate = (overrides: Partial<TemplateDeserialized> = {}): TemplateDeserialized => ({
  name: 'my_template',
  indexPatterns: ['logs-*'],
  allowAutoCreate: 'NO_OVERWRITE',
  indexMode: 'standard',
  template: {
    settings: { index: { number_of_shards: 1 } },
    mappings: {},
    aliases: {},
  },
  dataStream: {},
  composedOf: [],
  _kbnMeta: {
    type: 'default',
    hasDatastream: false,
    isLegacy: false,
  },
  ...overrides,
});

const defaultProps = {
  template: { name: 'my_template' as const, isLegacy: false as boolean | undefined },
  onClose: jest.fn(),
  editTemplate: jest.fn(),
  cloneTemplate: jest.fn(),
  reload: jest.fn(),
};

describe('TemplateDetailsContent', () => {
  const mockedUseLoadIndexTemplate = useLoadIndexTemplate as jest.MockedFunction<
    typeof useLoadIndexTemplate
  >;
  const mockedUseServices = useServices as jest.MockedFunction<typeof useServices>;
  const mockedUseAppContext = useAppContext as jest.MockedFunction<typeof useAppContext>;

  beforeEach(() => {
    jest.clearAllMocks();
    mockTrackMetric.mockClear();
    mockedUseServices.mockReturnValue({
      uiMetricService: { trackMetric: mockTrackMetric },
    } as unknown as ReturnType<typeof useServices>);
    mockedUseAppContext.mockReturnValue({
      privs: {
        manageIndexTemplates: true,
        monitor: true,
        manageEnrich: true,
        monitorEnrich: true,
      },
    } as ReturnType<typeof useAppContext>);
  });

  it('renders loading state while the template request is in flight', () => {
    mockedUseLoadIndexTemplate.mockReturnValue(
      getUseRequestMock({
        isLoading: true,
        error: null,
        data: null,
      })
    );

    render(<TemplateDetailsContent {...defaultProps} />);

    expect(screen.getByTestId('sectionLoading')).toBeInTheDocument();
  });

  it('renders an error section when loading the template fails', () => {
    mockedUseLoadIndexTemplate.mockReturnValue(
      getUseRequestMock({
        isLoading: false,
        error: createRequestError('request failed'),
        data: null,
      })
    );

    render(<TemplateDetailsContent {...defaultProps} />);

    expect(screen.getByTestId('sectionError')).toBeInTheDocument();
  });

  it('renders the template name in the header and the summary tab content by default', () => {
    const template = makeTemplate({ name: 'loaded-tpl' });
    mockedUseLoadIndexTemplate.mockReturnValue(
      getUseRequestMock({ isLoading: false, error: null, data: template })
    );

    render(
      <TemplateDetailsContent
        {...defaultProps}
        template={{ name: 'loaded-tpl', isLegacy: false }}
      />
    );

    expect(screen.getByTestId('title')).toHaveTextContent('loaded-tpl');
    expect(screen.getByTestId('tabSummaryPanel')).toBeInTheDocument();
    expect(screen.getByTestId('templateType-default')).toBeInTheDocument();
  });

  it('shows the deprecated badge when the template is deprecated', () => {
    const template = makeTemplate({ deprecated: true });
    mockedUseLoadIndexTemplate.mockReturnValue(
      getUseRequestMock({ isLoading: false, error: null, data: template })
    );

    render(<TemplateDetailsContent {...defaultProps} />);

    expect(screen.getByTestId('templateDeprecatedBadge')).toBeInTheDocument();
  });

  it('includes the Preview tab when the user can manage index templates', () => {
    const template = makeTemplate();
    mockedUseLoadIndexTemplate.mockReturnValue(
      getUseRequestMock({ isLoading: false, error: null, data: template })
    );

    render(<TemplateDetailsContent {...defaultProps} />);

    expect(screen.getByTestId('previewTabBtn')).toBeInTheDocument();
  });

  it('omits the Preview tab when the user cannot manage index templates', () => {
    mockedUseAppContext.mockReturnValue({
      privs: {
        manageIndexTemplates: false,
        monitor: true,
        manageEnrich: true,
        monitorEnrich: true,
      },
    } as ReturnType<typeof useAppContext>);

    const template = makeTemplate();
    mockedUseLoadIndexTemplate.mockReturnValue(
      getUseRequestMock({ isLoading: false, error: null, data: template })
    );

    render(<TemplateDetailsContent {...defaultProps} />);

    expect(screen.queryByTestId('previewTabBtn')).not.toBeInTheDocument();
  });

  it('hides the Preview tab for legacy templates even when management is allowed', () => {
    const template = makeTemplate({
      _kbnMeta: { type: 'default', hasDatastream: false, isLegacy: true },
    });
    mockedUseLoadIndexTemplate.mockReturnValue(
      getUseRequestMock({ isLoading: false, error: null, data: template })
    );

    render(
      <TemplateDetailsContent
        {...defaultProps}
        template={{ name: 'my_template', isLegacy: true }}
      />
    );

    expect(screen.queryByTestId('previewTabBtn')).not.toBeInTheDocument();
  });

  it('shows the cloud-managed callout and disables edit/delete for cloud-managed templates', () => {
    const template = makeTemplate({
      _kbnMeta: { type: 'cloudManaged', hasDatastream: false },
    });
    mockedUseLoadIndexTemplate.mockReturnValue(
      getUseRequestMock({ isLoading: false, error: null, data: template })
    );

    render(<TemplateDetailsContent {...defaultProps} />);

    expect(
      screen.getByText('Editing a cloud-managed template is not permitted.')
    ).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('manageTemplateButton'));

    expect(screen.getByTestId('editIndexTemplateButton')).toBeDisabled();
    expect(screen.getByTestId('deleteIndexTemplateButton')).toBeDisabled();
  });

  it('tracks UI metrics and switches tab panels when a tab is selected', () => {
    const template = makeTemplate();
    mockedUseLoadIndexTemplate.mockReturnValue(
      getUseRequestMock({ isLoading: false, error: null, data: template })
    );

    render(<TemplateDetailsContent {...defaultProps} />);

    expect(screen.getByTestId('tabSummaryPanel')).toBeInTheDocument();

    fireEvent.click(screen.getByTestId('summaryTabBtn'));
    expect(mockTrackMetric).toHaveBeenCalledWith(
      METRIC_TYPE.CLICK,
      UIM_TEMPLATE_DETAIL_PANEL_SUMMARY_TAB
    );

    fireEvent.click(screen.getByTestId('mappingsTabBtn'));
    expect(mockTrackMetric).toHaveBeenCalledWith(
      METRIC_TYPE.CLICK,
      UIM_TEMPLATE_DETAIL_PANEL_MAPPINGS_TAB
    );
    expect(screen.getByTestId('tabMappingsPanel')).toBeInTheDocument();
  });

  it('invokes onClose when Close is clicked', () => {
    const template = makeTemplate();
    mockedUseLoadIndexTemplate.mockReturnValue(
      getUseRequestMock({ isLoading: false, error: null, data: template })
    );
    const onClose = jest.fn();

    render(<TemplateDetailsContent {...defaultProps} onClose={onClose} />);

    fireEvent.click(screen.getByTestId('closeDetailsButton'));
    expect(onClose).toHaveBeenCalled();
  });

  it('opens the manage menu and calls editTemplate when Edit is chosen', () => {
    const template = makeTemplate();
    mockedUseLoadIndexTemplate.mockReturnValue(
      getUseRequestMock({ isLoading: false, error: null, data: template })
    );
    const editTemplate = jest.fn();

    render(<TemplateDetailsContent {...defaultProps} editTemplate={editTemplate} />);

    fireEvent.click(screen.getByTestId('manageTemplateButton'));
    fireEvent.click(screen.getByTestId('editIndexTemplateButton'));

    expect(editTemplate).toHaveBeenCalledWith('my_template', false);
  });

  it('shows the delete modal after choosing Delete in the manage menu', () => {
    const template = makeTemplate({ name: 'del-me' });
    mockedUseLoadIndexTemplate.mockReturnValue(
      getUseRequestMock({ isLoading: false, error: null, data: template })
    );

    render(
      <TemplateDetailsContent
        {...defaultProps}
        template={{ name: 'del-me', isLegacy: false }}
        editTemplate={jest.fn()}
        cloneTemplate={jest.fn()}
      />
    );

    fireEvent.click(screen.getByTestId('manageTemplateButton'));
    expect(screen.queryByTestId('templateDeleteModal')).not.toBeInTheDocument();

    fireEvent.click(screen.getByTestId('deleteIndexTemplateButton'));

    expect(screen.getByTestId('templateDeleteModal')).toBeInTheDocument();
    expect(screen.getByTestId('templateDeleteModal')).toHaveAttribute(
      'data-template-names',
      'del-me'
    );
  });
});
