/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { fireEvent, render, screen } from '@testing-library/react';
import type { FileUploadStartDependencies } from '../../kibana_context';
import { STATUS } from '../../../../file_upload_manager';
import { useFileUploadContext } from '../../../use_file_upload';
import { FileUploadPanel } from './file_upload_panel';

jest.mock('../../../../file_upload_manager', () => ({
  ...jest.requireActual('../../../../file_upload_manager'),
  FileUploadManager: jest.fn(),
}));

jest.mock('../../../use_file_upload', () => {
  const { createContext } = jest.requireActual('react');
  return {
    FileUploadContext: createContext(undefined),
    useFileUpload: jest.fn(() => ({})),
    useFileUploadContext: jest.fn(),
  };
});

jest.mock('../file_picker', () => ({ FilePicker: () => null }));
jest.mock('../file_status', () => ({ FileStatus: () => null }));
jest.mock('../file_clash_warning', () => ({
  FileClashWarning: () => null,
}));
jest.mock('../index_selection/index_input', () => ({
  IndexInput: ({ initialIndexName }: { initialIndexName?: string }) => (
    <div data-test-subj="mockIndexInput">{initialIndexName}</div>
  ),
}));
jest.mock('../upload_image', () => ({ UploadImage: () => null }));
jest.mock('../overall_upload_status', () => ({
  OverallUploadStatus: () => <div data-test-subj="mockOverallUploadStatus" />,
}));
jest.mock('../import_errors', () => ({
  ImportErrors: () => null,
}));

const useFileUploadContextMock = useFileUploadContext as jest.Mock;

const dependencies = {
  application: { capabilities: {} },
} as unknown as FileUploadStartDependencies;

const mockContext = (
  overallImportStatus: STATUS,
  overrides: Record<string, unknown> = {}
): Record<string, jest.Mock> => {
  const context = {
    fileUploadManager: {},
    filesStatus: [{}],
    uploadStatus: { overallImportStatus, analysisStatus: STATUS.COMPLETED },
    fileClashes: false,
    uploadStarted: overallImportStatus !== STATUS.NOT_STARTED,
    onImportClick: jest.fn(),
    canImport: true,
    abortImport: jest.fn(),
    setIndexName: jest.fn(),
    setIndexValidationStatus: jest.fn(),
    ...overrides,
  };
  useFileUploadContextMock.mockReturnValue(context);
  return context as unknown as Record<string, jest.Mock>;
};

const renderPanel = (uploadedIndex?: string) => {
  const closeCanvas = jest.fn();
  render(
    <FileUploadPanel
      dependencies={dependencies}
      uploadedIndex={uploadedIndex}
      suggestedIndexName="sales"
      onUploadComplete={jest.fn()}
      closeCanvas={closeCanvas}
    />
  );
  return { closeCanvas };
};

describe('FileUploadPanel', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('only shows a message when the file was already uploaded', () => {
    mockContext(STATUS.NOT_STARTED);
    renderPanel('sales');

    expect(screen.getByTestId('fileUploadPanelAlreadyUploaded')).toHaveTextContent(
      'Data has already been uploaded to the index sales.'
    );
    expect(screen.queryByTestId('mockIndexInput')).not.toBeInTheDocument();
  });

  it('pre-fills the suggested index name and shows Import under it', () => {
    const context = mockContext(STATUS.NOT_STARTED);
    renderPanel();

    expect(screen.getByTestId('mockIndexInput')).toHaveTextContent('sales');
    fireEvent.click(screen.getByTestId('fileUploadPanelImportButton'));
    expect(context.onImportClick).toHaveBeenCalled();
  });

  it('disables Import until the upload can start', () => {
    mockContext(STATUS.NOT_STARTED, { canImport: false });
    renderPanel();

    expect(screen.getByTestId('fileUploadPanelImportButton')).toBeDisabled();
  });

  it('hides Import until a file has been analyzed', () => {
    mockContext(STATUS.NOT_STARTED, { filesStatus: [] });
    renderPanel();

    expect(screen.queryByTestId('fileUploadPanelImportButton')).not.toBeInTheDocument();
  });

  it('offers Cancel while importing', () => {
    const context = mockContext(STATUS.STARTED);
    renderPanel();

    expect(screen.getByTestId('mockOverallUploadStatus')).toBeInTheDocument();
    fireEvent.click(screen.getByTestId('fileUploadPanelCancelButton'));
    expect(context.abortImport).toHaveBeenCalled();
  });

  it('offers Done once the import has finished', () => {
    mockContext(STATUS.COMPLETED);
    const { closeCanvas } = renderPanel();

    fireEvent.click(screen.getByTestId('fileUploadPanelDoneButton'));
    expect(closeCanvas).toHaveBeenCalled();
  });
});
