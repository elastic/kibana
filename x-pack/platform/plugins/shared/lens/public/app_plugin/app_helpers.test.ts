/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import { renderHook, act } from '@testing-library/react';
import { faker } from '@faker-js/faker';
import type { UseNavigateBackToAppProps } from './app_helpers';
import { getTelemetrySource, useNavigateBackToApp } from './app_helpers';
import { defaultDoc, makeDefaultServices } from '../mocks/services_mock';
import type { LensDocument } from '@kbn/lens-common';

function getLensDocumentMock(someProps?: Partial<LensDocument>) {
  return structuredClone({ ...defaultDoc, ...someProps });
}

const getApplicationMock = () => makeDefaultServices().application;

describe('App helpers', () => {
  function getDefaultProps(
    someProps?: Partial<UseNavigateBackToAppProps>
  ): UseNavigateBackToAppProps {
    return {
      application: getApplicationMock(),
      onAppLeave: jest.fn(),
      legacyEditorAppName: faker.lorem.word(),
      legacyEditorAppUrl: faker.internet.url(),
      isLensEqual: jest.fn(() => true),
      initialDocFromContext: undefined,
      persistedDoc: getLensDocumentMock(),
      ...someProps,
    };
  }
  describe('useNavigateBackToApp', () => {
    it('navigates back to originating app if documents has not changed', () => {
      const props = getDefaultProps();
      const { result } = renderHook(() => useNavigateBackToApp(props));

      act(() => {
        result.current.goBackToOriginatingApp();
      });

      expect(props.application.navigateToApp).toHaveBeenCalledWith(props.legacyEditorAppName, {
        path: props.legacyEditorAppUrl,
      });
    });

    it('shows modal if documents are not equal', () => {
      const props = getDefaultProps({ isLensEqual: jest.fn().mockReturnValue(false) });
      const { result } = renderHook(() => useNavigateBackToApp(props));

      act(() => {
        result.current.goBackToOriginatingApp();
      });

      expect(props.application.navigateToApp).not.toHaveBeenCalled();
      expect(result.current.shouldShowGoBackToVisEditorModal).toBe(true);
    });

    it('navigateToVisEditor hides modal and navigates back to Vis editor', () => {
      const props = getDefaultProps();
      const { result } = renderHook(() => useNavigateBackToApp(props));

      act(() => {
        result.current.navigateToVisEditor();
      });

      expect(result.current.shouldShowGoBackToVisEditorModal).toBe(false);
      expect(props.application.navigateToApp).toHaveBeenCalledWith(props.legacyEditorAppName, {
        path: props.legacyEditorAppUrl,
      });
    });
  });

  describe('getTelemetrySource', () => {
    it('returns dashboards when creating a new panel from a dashboard', () => {
      expect(
        getTelemetrySource({ originatingApp: 'dashboards', originatingPath: '#/view/123' })
      ).toBe('dashboards');
    });

    it('returns undefined when editing an existing dashboard panel', () => {
      expect(
        getTelemetrySource({
          originatingApp: 'dashboards',
          originatingPath: '#/view/123',
          embeddableId: 'panel-1',
        })
      ).toBeUndefined();
    });

    it('returns dashboards when an existing dashboard panel is saved as a new copy', () => {
      expect(
        getTelemetrySource(
          {
            originatingApp: 'dashboards',
            originatingPath: '#/view/123',
            embeddableId: 'panel-1',
          },
          true
        )
      ).toBe('dashboards');
    });

    it('returns undefined for untracked app', () => {
      expect(
        getTelemetrySource({ originatingApp: 'securitySolutionUI', originatingPath: '/dashboards' })
      ).toBeUndefined();
    });

    it('returns dashboards when created from a dashboard hosted in another app', () => {
      expect(
        getTelemetrySource({
          originatingApp: 'securitySolutionUI',
          originatingPath: '/dashboards/123/edit',
          originatingContainer: 'dashboard',
        })
      ).toBe('dashboards');
    });

    it('returns library when creating from the Visualize library', () => {
      expect(getTelemetrySource({ originatingApp: 'visualize' })).toBe('library');
    });

    it('returns library when creating from the Dashboards app visualizations tab', () => {
      expect(getTelemetrySource({ originatingApp: 'dashboards' })).toBe('library');
    });

    it('returns discover when editing a Discover chart in Lens', () => {
      expect(getTelemetrySource({ originatingApp: 'discover' })).toBe('discover');
    });
  });
});
