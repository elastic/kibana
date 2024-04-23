/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */
import { getContextMenuPanels, PRIMARY_PANEL_ID } from '.';
import * as i18n from '../translations';
import { ContextEditorRow } from '../types';

describe('getContextMenuPanels', () => {
  const closePopover = jest.fn();
  const onListUpdated = jest.fn();
  const selected: ContextEditorRow[] = [
    {
      allowed: true,
      anonymized: true,
      denied: false,
      field: 'user.name',
      rawValues: ['jodi'],
    },
  ];

  beforeEach(() => jest.clearAllMocks());

  it('the first panel has a `primary-panel-id`', () => {
    const panels = getContextMenuPanels({
      disableAllow: false,
      disableAnonymize: false,
      disableDeny: false,
      disableUnanonymize: false,
      closePopover,
      onListUpdated,
      selected,
    });

    expect(panels[0].id).toEqual(PRIMARY_PANEL_ID);
  });

  describe('allow', () => {
    it('is disabled when `disableAlow` is true', () => {
      const disableAllow = true;

      const panels = getContextMenuPanels({
        disableAllow,
        disableAnonymize: false,
        disableDeny: false,
        disableUnanonymize: false,
        closePopover,
        onListUpdated,
        selected,
      });

      const allowItem = panels[0].items?.find((item) => item.name === i18n.ALLOW);

      expect(allowItem?.disabled).toBe(true);
    });

    it('is NOT disabled when `disableAlow` is false', () => {
      const disableAllow = false;

      const panels = getContextMenuPanels({
        disableAllow,
        disableAnonymize: false,
        disableDeny: false,
        disableUnanonymize: false,
        closePopover,
        onListUpdated,
        selected,
      });

      const allowItem = panels[0].items?.find((item) => item.name === i18n.ALLOW);

      expect(allowItem?.disabled).toBe(false);
    });

    it('calls closePopover when allow is clicked', () => {
      const panels = getContextMenuPanels({
        disableAllow: false,
        disableAnonymize: false,
        disableDeny: false,
        disableUnanonymize: false,
        closePopover,
        onListUpdated,
        selected,
      });

      const allowItem = panels[0].items?.find((item) => item.name === i18n.ALLOW);

      allowItem?.onClick!(
        new MouseEvent('click', { bubbles: true }) as unknown as React.MouseEvent<
          HTMLHRElement,
          MouseEvent
        >
      );

      expect(closePopover).toHaveBeenCalled();
    });

    it('calls onListUpdated to add the field to the `allow` list', () => {
      const panels = getContextMenuPanels({
        disableAllow: false,
        disableAnonymize: false,
        disableDeny: false,
        disableUnanonymize: false,
        closePopover,
        onListUpdated,
        selected,
      });

      const allowItem = panels[0].items?.find((item) => item.name === i18n.ALLOW);

      allowItem?.onClick!(
        new MouseEvent('click', { bubbles: true }) as unknown as React.MouseEvent<
          HTMLHRElement,
          MouseEvent
        >
      );

      expect(onListUpdated).toHaveBeenCalledWith([
        { field: 'user.name', operation: 'add', update: 'allow' },
      ]);
    });
  });

  describe('deny', () => {
    it('is disabled when `disableDeny` is true', () => {
      const disableDeny = true;

      const panels = getContextMenuPanels({
        disableAllow: false,
        disableAnonymize: false,
        disableDeny,
        disableUnanonymize: false,
        closePopover,
        onListUpdated,
        selected,
      });

      const denyItem = panels[0].items?.find((item) => item.name === i18n.DENY);

      expect(denyItem?.disabled).toBe(true);
    });

    it('is NOT disabled when `disableDeny` is false', () => {
      const disableDeny = false;

      const panels = getContextMenuPanels({
        disableAllow: false,
        disableAnonymize: false,
        disableDeny,
        disableUnanonymize: false,
        closePopover,
        onListUpdated,
        selected,
      });

      const denyItem = panels[0].items?.find((item) => item.name === i18n.DENY);

      expect(denyItem?.disabled).toBe(false);
    });

    it('calls closePopover when deny is clicked', () => {
      const panels = getContextMenuPanels({
        disableAllow: false,
        disableAnonymize: false,
        disableDeny: false,
        disableUnanonymize: false,
        closePopover,
        onListUpdated,
        selected,
      });

      const denyByDefaultItem = panels[0].items?.find((item) => item.name === i18n.DENY);

      denyByDefaultItem?.onClick!(
        new MouseEvent('click', { bubbles: true }) as unknown as React.MouseEvent<
          HTMLHRElement,
          MouseEvent
        >
      );

      expect(closePopover).toHaveBeenCalled();
    });

    it('calls onListUpdated to remove the field from the `allow` list', () => {
      const panels = getContextMenuPanels({
        disableAllow: false,
        disableAnonymize: false,
        disableDeny: false,
        disableUnanonymize: false,
        closePopover,
        onListUpdated,
        selected,
      });

      const denyItem = panels[0].items?.find((item) => item.name === i18n.DENY);

      denyItem?.onClick!(
        new MouseEvent('click', { bubbles: true }) as unknown as React.MouseEvent<
          HTMLHRElement,
          MouseEvent
        >
      );

      expect(onListUpdated).toHaveBeenCalledWith([
        { field: 'user.name', operation: 'remove', update: 'allow' },
      ]);
    });
  });

  describe('anonymize', () => {
    it('is disabled when `disableAnonymize` is true', () => {
      const disableAnonymize = true;

      const panels = getContextMenuPanels({
        disableAllow: false,
        disableAnonymize,
        disableDeny: false,
        disableUnanonymize: false,
        closePopover,
        onListUpdated,
        selected,
      });

      const anonymizeItem = panels[0].items?.find((item) => item.name === i18n.ANONYMIZE);

      expect(anonymizeItem?.disabled).toBe(true);
    });

    it('is NOT disabled when `disableAnonymize` is false', () => {
      const disableAnonymize = false;

      const panels = getContextMenuPanels({
        disableAllow: false,
        disableAnonymize,
        disableDeny: false,
        disableUnanonymize: false,
        closePopover,
        onListUpdated,
        selected,
      });

      const anonymizeItem = panels[0].items?.find((item) => item.name === i18n.ANONYMIZE);

      expect(anonymizeItem?.disabled).toBe(false);
    });

    it('calls closePopover when anonymize is clicked', () => {
      const panels = getContextMenuPanels({
        disableAllow: false,
        disableAnonymize: false,
        disableDeny: false,
        disableUnanonymize: false,
        closePopover,
        onListUpdated,
        selected,
      });

      const anonymizeItem = panels[0].items?.find((item) => item.name === i18n.ANONYMIZE);

      anonymizeItem?.onClick!(
        new MouseEvent('click', { bubbles: true }) as unknown as React.MouseEvent<
          HTMLHRElement,
          MouseEvent
        >
      );

      expect(closePopover).toHaveBeenCalled();
    });

    it('calls onListUpdated to add the field to both the `allowReplacement` and `defaultAllowReplacement` lists', () => {
      const panels = getContextMenuPanels({
        disableAllow: false,
        disableAnonymize: false,
        disableDeny: false,
        disableUnanonymize: false,
        closePopover,
        onListUpdated,
        selected,
      });

      const anonymizeItem = panels[0].items?.find((item) => item.name === i18n.ANONYMIZE);

      anonymizeItem?.onClick!(
        new MouseEvent('click', { bubbles: true }) as unknown as React.MouseEvent<
          HTMLHRElement,
          MouseEvent
        >
      );

      expect(onListUpdated).toHaveBeenCalledWith([
        { field: 'user.name', operation: 'add', update: 'allowReplacement' },
      ]);
    });
  });

  describe('unanonymize', () => {
    it('is disabled when `disableUnanonymize` is true', () => {
      const disableUnanonymize = true;

      const panels = getContextMenuPanels({
        disableAllow: false,
        disableAnonymize: false,
        disableDeny: false,
        disableUnanonymize,
        closePopover,
        onListUpdated,
        selected,
      });

      const unanonymizeItem = panels[0].items?.find((item) => item.name === i18n.UNANONYMIZE);

      expect(unanonymizeItem?.disabled).toBe(true);
    });

    it('is NOT disabled when `disableUnanonymize` is false', () => {
      const disableUnanonymize = false;

      const panels = getContextMenuPanels({
        disableAllow: false,
        disableAnonymize: false,
        disableDeny: false,
        disableUnanonymize,
        closePopover,
        onListUpdated,
        selected,
      });

      const unanonymizeItem = panels[0].items?.find((item) => item.name === i18n.UNANONYMIZE);

      expect(unanonymizeItem?.disabled).toBe(false);
    });

    it('calls closePopover when unanonymize is clicked', () => {
      const panels = getContextMenuPanels({
        disableAllow: false,
        disableAnonymize: false,
        disableDeny: false,
        disableUnanonymize: false,
        closePopover,
        onListUpdated,
        selected,
      });

      const unAnonymizeItem = panels[0].items?.find((item) => item.name === i18n.UNANONYMIZE);

      unAnonymizeItem?.onClick!(
        new MouseEvent('click', { bubbles: true }) as unknown as React.MouseEvent<
          HTMLHRElement,
          MouseEvent
        >
      );

      expect(closePopover).toHaveBeenCalled();
    });

    it('calls onListUpdated to remove the field from the `allowReplacement` list', () => {
      const panels = getContextMenuPanels({
        disableAllow: false,
        disableAnonymize: false,
        disableDeny: false,
        disableUnanonymize: false,
        closePopover,
        onListUpdated,
        selected,
      });

      const unAnonymizeItem = panels[0].items?.find((item) => item.name === i18n.UNANONYMIZE);

      unAnonymizeItem?.onClick!(
        new MouseEvent('click', { bubbles: true }) as unknown as React.MouseEvent<
          HTMLHRElement,
          MouseEvent
        >
      );

      expect(onListUpdated).toHaveBeenCalledWith([
        { field: 'user.name', operation: 'remove', update: 'allowReplacement' },
      ]);
    });
  });
});
