/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { render } from '@testing-library/react';
import { ConnectorIconsMap } from '@kbn/connector-specs/icons';
import { getConnectorIcon } from './get_connector_icon';
import type { Connector } from '../types/connector';

// Mock the connector-specs icons
jest.mock('@kbn/connector-specs/icons', () => ({
  ConnectorIconsMap: new Map(),
}));

describe('getConnectorIcon', () => {
  const mockConnector: Connector = {
    id: 'test-connector',
    name: 'Test Connector',
    type: '.notion',
    category: 'popular',
  };

  beforeEach(() => {
    jest.clearAllMocks();
    (ConnectorIconsMap as Map<string, React.ComponentType<any>>).clear();
  });

  describe('with connector-specs icon', () => {
    it('should render lazy-loaded icon when connector type starts with dot and icon exists', () => {
      const MockIcon = () => <div data-test-subj="mock-notion-icon">Notion Icon</div>;
      (ConnectorIconsMap as Map<string, React.ComponentType<any>>).set('.notion', MockIcon);

      const { container } = render(<>{getConnectorIcon(mockConnector, 'l')}</>);

      expect(container.querySelector('[data-test-subj="mock-notion-icon"]')).toBeInTheDocument();
    });

    it('should render skeleton fallback while icon is loading', () => {
      // Create a mock icon that throws to simulate suspended state
      const MockIcon = () => {
        throw new Promise(() => {});
      };
      (ConnectorIconsMap as Map<string, React.ComponentType<any>>).set('.notion', MockIcon);

      const { container } = render(<>{getConnectorIcon(mockConnector, 'l')}</>);

      // EuiSkeletonCircle renders a span with specific classes
      const skeleton = container.querySelector('.euiSkeletonCircle');
      expect(skeleton).toBeInTheDocument();
    });
  });

  describe('fallback to default icon', () => {
    it('should render fallback icon when connector type does not start with dot', () => {
      const connectorWithoutDot: Connector = {
        ...mockConnector,
        type: 'notion', // No dot prefix
      };

      const { container } = render(<>{getConnectorIcon(connectorWithoutDot, 'l')}</>);

      // EuiIcon renders with specific data-euiicon-type attribute
      const icon = container.querySelector('[data-euiicon-type="application"]');
      expect(icon).toBeInTheDocument();
    });

    it('should render fallback icon when connector type starts with dot but icon not found in map', () => {
      // ConnectorIconsMap is empty, so .notion won't be found
      const { container } = render(<>{getConnectorIcon(mockConnector, 'l')}</>);

      const icon = container.querySelector('[data-euiicon-type="application"]');
      expect(icon).toBeInTheDocument();
    });
  });
});
