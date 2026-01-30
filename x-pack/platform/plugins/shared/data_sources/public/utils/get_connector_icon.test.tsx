/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import { getConnectorIcon, getConnectorIconType } from './get_connector_icon';

// Mock the connector-specs icons
jest.mock('@kbn/connector-specs/icons', () => ({
  ConnectorIconsMap: new Map(),
}));

describe('Connector Icon Utils', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    (ConnectorIconsMap as Map<string, React.ComponentType<any>>).clear();
  });

  describe('getConnectorIconType', () => {
    it('should return icon component when icon exists in map', () => {
      const MockIcon = () => <div>Notion Icon</div>;
      (ConnectorIconsMap as Map<string, React.ComponentType<any>>).set('.notion', MockIcon);

      const result = getConnectorIconType('.notion');

      expect(result).toBe(MockIcon);
    });

    it('should return default integration string when icon not found in map', () => {
      const result = getConnectorIconType('.unknown');

      expect(result).toBe('integration');
    });
  });

  describe('getConnectorIcon', () => {
    describe('with connector-specs icon', () => {
      it('should render lazy-loaded icon component when icon exists in map', () => {
        const MockIcon = () => <div data-test-subj="mock-notion-icon">Notion Icon</div>;
        (ConnectorIconsMap as Map<string, React.ComponentType<any>>).set('.notion', MockIcon);

        const { container } = render(<>{getConnectorIcon('.notion', 'l')}</>);

        expect(container.querySelector('[data-test-subj="mock-notion-icon"]')).toBeInTheDocument();
      });

      it('should render skeleton fallback while icon is loading', () => {
        // Create a mock icon that throws to simulate suspended state
        const MockIcon = () => {
          throw new Promise(() => {});
        };
        (ConnectorIconsMap as Map<string, React.ComponentType<any>>).set('.notion', MockIcon);

        const { container } = render(<>{getConnectorIcon('.notion', 'l')}</>);

        // EuiSkeletonCircle renders a span with specific classes
        const skeleton = container.querySelector('.euiSkeletonCircle');
        expect(skeleton).toBeInTheDocument();
      });
    });

    describe('fallback to default icon', () => {
      it('should render default integration icon when icon not found in map', () => {
        const { container } = render(<>{getConnectorIcon('.notion', 'l')}</>);

        const icon = container.querySelector('[data-euiicon-type="integration"]');
        expect(icon).toBeInTheDocument();
      });

      it('should render default integration icon for unknown icon type', () => {
        const { container } = render(<>{getConnectorIcon('.unknown', 'l')}</>);

        const icon = container.querySelector('[data-euiicon-type="integration"]');
        expect(icon).toBeInTheDocument();
      });
    });
  });
});
