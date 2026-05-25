/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { UseFormReturn } from 'react-hook-form';
import { createInitialState } from '../use_compose_discover_state';
import type { ComposeDiscoverState } from '../types';
import type { ComposeFormValues } from '../compose_form_types';
import type { RuleFormServices } from '../../../form/contexts/rule_form_context';
import { getSteps } from '.';

const createState = (overrides: Partial<ComposeDiscoverState> = {}): ComposeDiscoverState => ({
  ...createInitialState({ mode: 'create' }),
  ...overrides,
});

describe('step validation', () => {
  describe('alertCondition.validate', () => {
    const alertStep = getSteps(false).find((s) => s.id === 'alertCondition')!;

    it('returns true when queryCommitted is true', async () => {
      const state = createState({ queryCommitted: true });
      const methods = {} as UseFormReturn<ComposeFormValues>;

      expect(await alertStep.validate!(methods, state)).toBe(true);
    });

    it('returns false when queryCommitted is false', async () => {
      const state = createState({ queryCommitted: false });
      const methods = {} as UseFormReturn<ComposeFormValues>;

      expect(await alertStep.validate!(methods, state)).toBe(false);
    });
  });

  describe('details.validate', () => {
    const detailsStep = getSteps(false).find((s) => s.id === 'details')!;

    it('delegates to methods.trigger with metadata.name', async () => {
      const state = createState();
      const methods = {
        trigger: jest.fn().mockResolvedValue(true),
      } as unknown as UseFormReturn<ComposeFormValues>;

      const result = await detailsStep.validate!(methods, state);

      expect(methods.trigger).toHaveBeenCalledWith(['metadata.name']);
      expect(result).toBe(true);
    });

    it('returns false when trigger rejects validation', async () => {
      const state = createState();
      const methods = {
        trigger: jest.fn().mockResolvedValue(false),
      } as unknown as UseFormReturn<ComposeFormValues>;

      const result = await detailsStep.validate!(methods, state);

      expect(result).toBe(false);
    });
  });

  describe('steps without validate', () => {
    it('recoveryCondition has no validate function', () => {
      const recoveryStep = getSteps(true).find((s) => s.id === 'recoveryCondition')!;
      expect(recoveryStep.validate).toBeUndefined();
    });
  });

  describe('notifications.validate', () => {
    const notificationsStep = getSteps(false).find((s) => s.id === 'notifications')!;

    const makeServices = (isValid?: (v: object) => boolean): RuleFormServices =>
      ({ workflowForm: { isValid } } as unknown as RuleFormServices);

    it('returns true in edit mode regardless of form state', async () => {
      const state = createState({ mode: 'edit' });
      const methods = {
        getValues: jest.fn().mockReturnValue({ workflow: {} }),
      } as unknown as UseFormReturn<ComposeFormValues>;
      expect(
        await notificationsStep.validate!(
          methods,
          state,
          makeServices(() => false)
        )
      ).toBe(true);
    });

    it('returns true when notifications are disabled', async () => {
      const state = createState({ mode: 'create' });
      const methods = {
        getValues: jest.fn().mockReturnValue(undefined),
      } as unknown as UseFormReturn<ComposeFormValues>;
      expect(await notificationsStep.validate!(methods, state, makeServices())).toBe(true);
    });

    it('returns false when notifications enabled and isValid returns false', async () => {
      const state = createState({ mode: 'create' });
      const methods = {
        getValues: jest.fn().mockReturnValue({ workflow: { mode: 'existing', workflowId: null } }),
      } as unknown as UseFormReturn<ComposeFormValues>;
      expect(
        await notificationsStep.validate!(
          methods,
          state,
          makeServices(() => false)
        )
      ).toBe(false);
    });

    it('returns true when notifications enabled and isValid returns true (existing workflow)', async () => {
      const state = createState({ mode: 'create' });
      const methods = {
        getValues: jest
          .fn()
          .mockReturnValue({ workflow: { mode: 'existing', workflowId: 'wf-1' } }),
      } as unknown as UseFormReturn<ComposeFormValues>;
      expect(
        await notificationsStep.validate!(
          methods,
          state,
          makeServices(() => true)
        )
      ).toBe(true);
    });

    it('returns false when notifications enabled and in create mode with no connector', async () => {
      const state = createState({ mode: 'create' });
      const methods = {
        getValues: jest.fn().mockReturnValue({
          workflow: { mode: 'create', connectorId: null, typeId: 'email', params: '' },
        }),
      } as unknown as UseFormReturn<ComposeFormValues>;
      expect(
        await notificationsStep.validate!(
          methods,
          state,
          makeServices(() => false)
        )
      ).toBe(false);
    });

    it('returns true when notifications enabled but services.workflowForm.isValid is absent', async () => {
      const state = createState({ mode: 'create' });
      const methods = {
        getValues: jest.fn().mockReturnValue({ workflow: {} }),
      } as unknown as UseFormReturn<ComposeFormValues>;
      expect(await notificationsStep.validate!(methods, state, makeServices())).toBe(true);
    });
  });
});
