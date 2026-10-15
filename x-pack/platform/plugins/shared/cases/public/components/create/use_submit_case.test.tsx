/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { waitFor, renderHook } from '@testing-library/react';

import { useKibana } from '../../common/lib/kibana';

import { usePostCase } from '../../containers/use_post_case';
import { useCreateAttachments } from '../../containers/use_create_attachments';

import { useGetAllCaseConfigurations } from '../../containers/configure/use_get_all_case_configurations';

import { useGetIssueTypes } from '../connectors/jira/use_get_issue_types';
import { useGetChoices } from '../connectors/servicenow/use_get_choices';
import { useGetFieldsByIssueType } from '../connectors/jira/use_get_fields_by_issue_type';
import { useGetAllCaseConfigurationsResponse } from '../configure_cases/__mock__';
import { usePostPushToService } from '../../containers/use_post_push_to_service';
import { useGetSupportedActionConnectors } from '../../containers/configure/use_get_supported_action_connectors';
import { useLicense } from '../../common/use_license';
import { useAvailableCasesOwners } from '../app/use_available_owners';
import { useSubmitCase, type UseSubmitCaseProps } from './use_submit_case';
import { TestProviders } from '../../common/mock/test_providers';
import { SECURITY_SOLUTION_OWNER } from '../../../common/constants';
import { SECURITY_ALERT_ATTACHMENT_TYPE } from '../../../common/constants/attachments';

import {
  sampleConnectorData,
  sampleData,
  useGetIssueTypesResponse,
  useGetFieldsByIssueTypeResponse,
  useGetChoicesResponse,
} from './mock';

jest.mock('../../containers/use_post_case');
jest.mock('../../containers/use_create_attachments');
jest.mock('../../containers/use_post_push_to_service');
jest.mock('../../containers/use_get_tags');
jest.mock('../../containers/configure/use_get_supported_action_connectors');
jest.mock('../../containers/configure/use_get_all_case_configurations');
jest.mock('../connectors/jira/use_get_issue_types');
jest.mock('../connectors/jira/use_get_fields_by_issue_type');
jest.mock('../connectors/jira/use_get_issues');
jest.mock('../connectors/servicenow/use_get_choices');
jest.mock('../../common/lib/kibana');
jest.mock('../../containers/user_profiles/api');
jest.mock('../../common/use_license');
jest.mock('../../containers/use_get_categories');
jest.mock('../app/use_available_owners');

const mockReportTemplateAppliedOnCreate = jest.fn();
jest.mock('../../analytics/templates/use_template_apply_ebt', () => ({
  useTemplateAppliedOnCreateEBT: () => mockReportTemplateAppliedOnCreate,
}));

const useGetConnectorsMock = useGetSupportedActionConnectors as jest.Mock;
const useGetAllCaseConfigurationsMock = useGetAllCaseConfigurations as jest.Mock;
const usePostCaseMock = usePostCase as jest.Mock;
const useCreateAttachmentsMock = useCreateAttachments as jest.Mock;
const usePostPushToServiceMock = usePostPushToService as jest.Mock;
const useGetIssueTypesMock = useGetIssueTypes as jest.Mock;
const useGetFieldsByIssueTypeMock = useGetFieldsByIssueType as jest.Mock;
const useGetChoicesMock = useGetChoices as jest.Mock;
const pushCaseToExternalService = jest.fn();
const useKibanaMock = useKibana as jest.Mocked<typeof useKibana>;
const useLicenseMock = useLicense as jest.Mock;
const useAvailableOwnersMock = useAvailableCasesOwners as jest.Mock;

const sampleId = 'case-id';

const postCase = jest.fn();

const defaultPostCase = {
  isLoading: false,
  isError: false,
  mutateAsync: postCase,
};

const defaultPostPushToService = {
  isLoading: false,
  isError: false,
  mutateAsync: pushCaseToExternalService,
};

const sampleDataWithoutTags = {
  ...sampleData,
  tags: [],
};

const renderUseSubmitCase = (props: UseSubmitCaseProps) =>
  renderHook(() => useSubmitCase(props), { wrapper: TestProviders });

describe('useSubmitCase', () => {
  beforeEach(() => {
    postCase.mockResolvedValue({
      id: sampleId,
      ...sampleDataWithoutTags,
    });
    usePostCaseMock.mockImplementation(() => defaultPostCase);

    const createAttachments = jest.fn();

    postCase.mockResolvedValue({
      id: sampleId,
      ...sampleDataWithoutTags,
    });
    usePostCaseMock.mockImplementation(() => defaultPostCase);
    useCreateAttachmentsMock.mockImplementation(() => ({ mutateAsync: createAttachments }));
    usePostPushToServiceMock.mockImplementation(() => defaultPostPushToService);
    useGetConnectorsMock.mockReturnValue(sampleConnectorData);
    useGetAllCaseConfigurationsMock.mockImplementation(() => useGetAllCaseConfigurationsResponse);
    useGetIssueTypesMock.mockReturnValue(useGetIssueTypesResponse);
    useGetFieldsByIssueTypeMock.mockReturnValue(useGetFieldsByIssueTypeResponse);
    useGetChoicesMock.mockReturnValue(useGetChoicesResponse);
    useAvailableOwnersMock.mockReturnValue(['securitySolution', 'observability', 'cases']);

    useKibanaMock().services.triggersActionsUi.actionTypeRegistry.get = jest.fn().mockReturnValue({
      actionTypeTitle: '.servicenow',
      iconClass: 'logoSecurity',
    });

    useLicenseMock.mockReturnValue({ isAtLeastGold: () => true, isAtLeastPlatinum: () => true });
  });

  beforeEach(() => jest.clearAllMocks());

  describe('if payload is valid', () => {
    const payloadIsValid = true;

    it('should post case', async () => {
      const onSuccess = jest.fn();
      const afterCaseCreated = jest.fn();

      usePostCaseMock.mockImplementationOnce(() => ({ ...defaultPostCase, isLoading: true }));

      const { result } = renderUseSubmitCase({
        attachments: [],
        onSuccess,
        afterCaseCreated,
      });

      await result.current.submitCase(sampleDataWithoutTags, payloadIsValid);

      await waitFor(() => {
        expect(postCase).toHaveBeenCalled();
      });

      expect(result.current.isSubmitting).toEqual(true);

      expect(postCase).toHaveBeenCalledWith({ request: sampleDataWithoutTags });
      expect(onSuccess).toHaveBeenCalled();
      expect(afterCaseCreated).toHaveBeenCalled();
    });
  });

  describe('getAttachments', () => {
    it('calls createAttachments with the resolved owner from theCase', async () => {
      const createAttachments = jest.fn();
      useCreateAttachmentsMock.mockImplementation(() => ({ mutateAsync: createAttachments }));

      const resolvedAttachment = {
        type: SECURITY_ALERT_ATTACHMENT_TYPE,
        attachmentId: 'alert-1',
        metadata: { index: 'idx-1', rule: null },
      };

      const getAttachments = jest.fn().mockReturnValue([resolvedAttachment]);

      postCase.mockResolvedValue({
        id: sampleId,
        ...sampleDataWithoutTags,
        owner: SECURITY_SOLUTION_OWNER,
      });

      const { result } = renderUseSubmitCase({ getAttachments });

      await result.current.submitCase(sampleDataWithoutTags, true);

      await waitFor(() => {
        expect(getAttachments).toHaveBeenCalledWith(SECURITY_SOLUTION_OWNER);
      });

      expect(createAttachments).toHaveBeenCalledWith({
        caseId: sampleId,
        caseOwner: SECURITY_SOLUTION_OWNER,
        attachments: [resolvedAttachment],
      });
    });

    it('does not call createAttachments when getAttachments returns empty array', async () => {
      const createAttachments = jest.fn();
      useCreateAttachmentsMock.mockImplementation(() => ({ mutateAsync: createAttachments }));

      postCase.mockResolvedValue({
        id: sampleId,
        ...sampleDataWithoutTags,
        owner: SECURITY_SOLUTION_OWNER,
      });

      const { result } = renderUseSubmitCase({ getAttachments: () => [] });

      await result.current.submitCase(sampleDataWithoutTags, true);

      await waitFor(() => {
        expect(postCase).toHaveBeenCalled();
      });

      expect(createAttachments).not.toHaveBeenCalled();
    });
  });

  describe('if payload is not valid', () => {
    const payloadIsValid = false;

    it('should not post case', async () => {
      const onSuccess = jest.fn();
      const afterCaseCreated = jest.fn();

      const { result } = renderUseSubmitCase({
        attachments: [],
        onSuccess,
        afterCaseCreated,
      });

      await result.current.submitCase(sampleDataWithoutTags, payloadIsValid);

      await waitFor(
        () => {
          expect(postCase).not.toHaveBeenCalled();
        },
        { timeout: 100 }
      );

      expect(result.current.isSubmitting).toEqual(false);
    });
  });

  describe('template telemetry', () => {
    it('reports the template once when the created case carries one', async () => {
      postCase.mockResolvedValue({
        id: sampleId,
        ...sampleDataWithoutTags,
        template: { id: 'tmpl-1', version: 2 },
      });

      const { result } = renderUseSubmitCase({ attachments: [] });

      await result.current.submitCase(sampleDataWithoutTags, true);

      await waitFor(() => {
        expect(mockReportTemplateAppliedOnCreate).toHaveBeenCalledWith({
          entryPoint: 'create_form',
        });
      });

      expect(mockReportTemplateAppliedOnCreate).toHaveBeenCalledTimes(1);
    });

    it('reports nothing when the created case carries no template', async () => {
      postCase.mockResolvedValue({ id: sampleId, ...sampleDataWithoutTags });

      const { result } = renderUseSubmitCase({ attachments: [] });

      await result.current.submitCase(sampleDataWithoutTags, true);

      await waitFor(() => {
        expect(postCase).toHaveBeenCalled();
      });

      expect(mockReportTemplateAppliedOnCreate).not.toHaveBeenCalled();
    });

    it('reports nothing when the request carried a template but the created case did not', async () => {
      // The event describes what the server stored, so the submitted request alone must not trigger
      // it. This is the assertion that fails if the report ever reads from `data` instead.
      postCase.mockResolvedValue({ id: sampleId, ...sampleDataWithoutTags });

      const { result } = renderUseSubmitCase({ attachments: [] });

      await result.current.submitCase(
        { ...sampleDataWithoutTags, template: { id: 'tmpl-1', version: 2 } },
        true
      );

      await waitFor(() => {
        expect(postCase).toHaveBeenCalled();
      });

      expect(mockReportTemplateAppliedOnCreate).not.toHaveBeenCalled();
    });

    it('reports nothing when the form is invalid, so an abandoned form is silent', async () => {
      const { result } = renderUseSubmitCase({ attachments: [] });

      await result.current.submitCase(sampleDataWithoutTags, false);

      expect(postCase).not.toHaveBeenCalled();
      expect(mockReportTemplateAppliedOnCreate).not.toHaveBeenCalled();
    });

    it('reports nothing when the create fails', async () => {
      postCase.mockRejectedValue(new Error('Network error'));

      const { result } = renderUseSubmitCase({ attachments: [] });

      await expect(result.current.submitCase(sampleDataWithoutTags, true)).rejects.toThrow();

      expect(mockReportTemplateAppliedOnCreate).not.toHaveBeenCalled();
    });

    it('reports the template even when the attachment write fails', async () => {
      // The case exists with its template by then, so an unrelated attachment failure must not
      // swallow the event. This is what fixes the report's position above the attachment block.
      const createAttachments = jest.fn().mockRejectedValue(new Error('attachment failed'));
      useCreateAttachmentsMock.mockImplementation(() => ({ mutateAsync: createAttachments }));

      postCase.mockResolvedValue({
        id: sampleId,
        ...sampleDataWithoutTags,
        owner: SECURITY_SOLUTION_OWNER,
        template: { id: 'tmpl-1', version: 2 },
      });

      const { result } = renderUseSubmitCase({
        getAttachments: () => [
          {
            type: SECURITY_ALERT_ATTACHMENT_TYPE,
            attachmentId: 'alert-1',
            metadata: { index: 'idx-1', rule: null },
          },
        ],
      });

      await expect(result.current.submitCase(sampleDataWithoutTags, true)).rejects.toThrow();

      expect(createAttachments).toHaveBeenCalled();
      expect(mockReportTemplateAppliedOnCreate).toHaveBeenCalledTimes(1);
    });

    it('reports nothing when the create returns no case', async () => {
      postCase.mockResolvedValue(undefined);

      const { result } = renderUseSubmitCase({ attachments: [] });

      await result.current.submitCase(sampleDataWithoutTags, true);

      await waitFor(() => {
        expect(postCase).toHaveBeenCalled();
      });

      expect(mockReportTemplateAppliedOnCreate).not.toHaveBeenCalled();
    });
  });
});
