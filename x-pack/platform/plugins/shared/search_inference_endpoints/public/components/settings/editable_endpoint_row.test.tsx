/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { EuiDragDropContext, EuiDroppable, EuiThemeProvider } from '@elastic/eui';
import { I18nProvider } from '@kbn/i18n-react';
import { EditableEndpointRow } from './editable_endpoint_row';
import type { ReasoningEffortLevel } from '../../../common/types';
import { EisModelStatus, type EndpointDeprecationInfo } from '../../types';

describe('EditableEndpointRow', () => {
  const onRemove = jest.fn();
  const onEffortChange = jest.fn();

  beforeEach(() => {
    jest.clearAllMocks();
  });

  const renderRow = ({
    endpointId = 'ep-1',
    label = 'Claude',
    isInvalid = false,
    deprecationInfo,
    supportedLevels,
    effort,
    canManage = true,
  }: Partial<{
    endpointId: string;
    label: string;
    isInvalid: boolean;
    deprecationInfo: EndpointDeprecationInfo;
    supportedLevels: ReasoningEffortLevel[];
    effort: ReasoningEffortLevel;
    canManage: boolean;
  }> = {}) =>
    render(
      <EuiThemeProvider>
        <I18nProvider>
          <EuiDragDropContext onDragEnd={jest.fn()}>
            <EuiDroppable droppableId="assigned-models-test_feature" spacing="none">
              <EditableEndpointRow
                endpointId={endpointId}
                index={0}
                icon="logoElastic"
                label={label}
                isInvalid={isInvalid}
                deprecationInfo={deprecationInfo}
                supportedLevels={supportedLevels}
                effort={effort}
                canManage={canManage}
                isRemoveDisabled={false}
                showDivider={false}
                onRemove={onRemove}
                onEffortChange={onEffortChange}
              />
            </EuiDroppable>
          </EuiDragDropContext>
        </I18nProvider>
      </EuiThemeProvider>
    );

  it('calls onRemove with the row index when remove is clicked', () => {
    renderRow();

    fireEvent.click(screen.getByTestId('remove-endpoint-ep-1'));

    expect(onRemove).toHaveBeenCalledWith(0);
  });

  it('does not render the remove button without manage permission', () => {
    renderRow({ canManage: false });

    expect(screen.queryByTestId('remove-endpoint-ep-1')).not.toBeInTheDocument();
  });

  it('shows a warning indicator for an invalid endpoint in editable mode', () => {
    renderRow({ isInvalid: true });

    expect(screen.getByTestId('endpoint-row-ep-1')).toHaveTextContent(
      'Inference endpoint Claude is no longer available'
    );
  });

  describe('deprecation badges', () => {
    it('renders the deprecated badge for an assigned deprecated endpoint', () => {
      renderRow({
        endpointId: 'ep-2',
        label: 'Claude 2',
        deprecationInfo: {
          name: 'Claude 2',
          status: EisModelStatus.Deprecated,
          metadata: {
            heuristics: { status: 'deprecated', end_of_life_date: '2099-01-01' },
          },
        },
      });

      expect(screen.getByTestId('modelDeprecatedBadge-ep-2')).toBeInTheDocument();
      expect(screen.queryByTestId('modelEolBadge-ep-2')).not.toBeInTheDocument();
    });

    it('renders the EOL badge for an assigned EOL endpoint', () => {
      renderRow({
        endpointId: 'ep-2',
        label: 'Claude 2',
        deprecationInfo: {
          name: 'Claude 2',
          status: EisModelStatus.DeprecatedEOL,
          metadata: {
            heuristics: { status: 'deprecated', end_of_life_date: '2020-01-01' },
          },
        },
      });

      expect(screen.getByTestId('modelEolBadge-ep-2')).toBeInTheDocument();
      expect(screen.queryByTestId('modelDeprecatedBadge-ep-2')).not.toBeInTheDocument();
    });
  });

  describe('reasoning effort', () => {
    it('shows the effort control only for models with supported effort levels', () => {
      renderRow({ supportedLevels: ['low', 'medium', 'high'] });
      renderRow({ endpointId: 'ep-2', label: 'Claude 2' });

      expect(screen.getByTestId('add-effort-ep-1')).toBeInTheDocument();
      expect(screen.queryByTestId('add-effort-ep-2')).not.toBeInTheDocument();
    });

    it('shows a saved effort with its remove action when the model lists no effort levels', () => {
      renderRow({ effort: 'low' });

      fireEvent.click(screen.getByTestId('effort-badge-ep-1'));

      expect(screen.queryByTestId('reasoningEffortButtonGroup')).not.toBeInTheDocument();
      expect(screen.getByTestId('remove-effort-customization')).toBeInTheDocument();
    });

    it('shows the customized effort as a pill', () => {
      renderRow({ supportedLevels: ['low', 'medium', 'high'], effort: 'high' });

      expect(screen.getByTestId('effort-badge-ep-1')).toHaveTextContent('high');
      expect(screen.queryByTestId('add-effort-ep-1')).not.toBeInTheDocument();
    });

    it('calls onEffortChange with the endpoint and the picked effort', () => {
      renderRow({ supportedLevels: ['low', 'medium', 'high'] });

      fireEvent.click(screen.getByTestId('add-effort-ep-1'));
      fireEvent.click(screen.getByTestId('reasoningEffort-medium'));

      expect(onEffortChange).toHaveBeenCalledWith('ep-1', 'medium');
    });

    it('shows a read-only pill and no add control without manage permission', () => {
      renderRow({
        supportedLevels: ['low', 'medium', 'high'],
        effort: 'high',
        canManage: false,
      });

      fireEvent.click(screen.getByTestId('effort-badge-ep-1'));

      expect(screen.queryByTestId('add-effort-ep-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('effort-popover-ep-1')).not.toBeInTheDocument();
      expect(screen.queryByTestId('remove-effort-customization')).not.toBeInTheDocument();
    });
  });
});
