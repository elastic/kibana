/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import type { FC, PropsWithChildren } from 'react';
import React from 'react';
import { act, render } from '@testing-library/react';
import { FlyoutNavigation } from './flyout_navigation';
import {
  COLLAPSE_DETAILS_BUTTON_TEST_ID,
  EXPAND_DETAILS_BUTTON_TEST_ID,
  HEADER_ACTIONS_TEST_ID,
} from '../test_ids';
import {
  ExpandableFlyoutApi,
  ExpandableFlyoutProvider,
  ExpandableFlyoutState,
  useExpandableFlyoutApi,
  useExpandableFlyoutState,
} from '@kbn/expandable-flyout';
import { I18nProvider } from '@kbn/i18n-react';

const expandDetails = jest.fn();
const mockFlyoutCloseLeftPanel = jest.fn();

jest.mock('@kbn/expandable-flyout', () => ({
  useExpandableFlyoutApi: jest.fn(() => {
    return {
      closeFlyout: jest.fn(),
      closeLeftPanel: jest.fn(),
      closePreviewPanel: jest.fn(),
      closeRightPanel: jest.fn(),
      previousPreviewPanel: jest.fn(),
      openFlyout: jest.fn(),
      openLeftPanel: jest.fn(),
      openPreviewPanel: jest.fn(),
      openRightPanel: jest.fn(),
    };
  }),
  useExpandableFlyoutState: jest.fn(),
  ExpandableFlyoutProvider: ({ children }: React.PropsWithChildren<{}>) => <>{children}</>,
  withExpandableFlyoutProvider: <T extends object>(Component: React.ComponentType<T>) => {
    return (props: T) => {
      return <Component {...props} />;
    };
  },
  ExpandableFlyout: jest.fn(),
}));

const ExpandableFlyoutTestProviders: FC<PropsWithChildren<{}>> = ({ children }) => {
  return (
    <I18nProvider>
      <ExpandableFlyoutProvider>{children}</ExpandableFlyoutProvider>
    </I18nProvider>
  );
};

describe('<FlyoutNavigation />', () => {
  beforeEach(() => {
    jest.mocked(useExpandableFlyoutApi).mockReturnValue({
      closeLeftPanel: mockFlyoutCloseLeftPanel,
    } as unknown as ExpandableFlyoutApi);
    jest.mocked(useExpandableFlyoutState).mockReturnValue({} as unknown as ExpandableFlyoutState);
  });

  describe('when flyout is expandable', () => {
    it('should render expand button', () => {
      const { getByTestId, queryByTestId } = render(
        <ExpandableFlyoutTestProviders>
          <FlyoutNavigation flyoutIsExpandable={true} expandDetails={expandDetails} />
        </ExpandableFlyoutTestProviders>
      );
      expect(getByTestId(EXPAND_DETAILS_BUTTON_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(EXPAND_DETAILS_BUTTON_TEST_ID)).toHaveTextContent('Expand details');
      expect(queryByTestId(COLLAPSE_DETAILS_BUTTON_TEST_ID)).not.toBeInTheDocument();

      getByTestId(EXPAND_DETAILS_BUTTON_TEST_ID).click();
      expect(expandDetails).toHaveBeenCalled();
    });

    it('should render collapse button', () => {
      jest
        .mocked(useExpandableFlyoutState)
        .mockReturnValue({ left: {} } as unknown as ExpandableFlyoutState);

      const { getByTestId, queryByTestId } = render(
        <ExpandableFlyoutTestProviders>
          <FlyoutNavigation flyoutIsExpandable={true} expandDetails={expandDetails} />
        </ExpandableFlyoutTestProviders>
      );

      expect(getByTestId(COLLAPSE_DETAILS_BUTTON_TEST_ID)).toBeInTheDocument();
      expect(getByTestId(COLLAPSE_DETAILS_BUTTON_TEST_ID)).toHaveTextContent('Collapse details');
      expect(queryByTestId(EXPAND_DETAILS_BUTTON_TEST_ID)).not.toBeInTheDocument();

      getByTestId(COLLAPSE_DETAILS_BUTTON_TEST_ID).click();
      expect(mockFlyoutCloseLeftPanel).toHaveBeenCalled();
    });
  });

  it('should not render expand details button if flyout is not expandable', () => {
    const { queryByTestId, getByTestId } = render(
      <ExpandableFlyoutTestProviders>
        <FlyoutNavigation flyoutIsExpandable={false} actions={<div />} />
      </ExpandableFlyoutTestProviders>
    );
    expect(getByTestId(HEADER_ACTIONS_TEST_ID)).toBeInTheDocument();
    expect(queryByTestId(EXPAND_DETAILS_BUTTON_TEST_ID)).not.toBeInTheDocument();
    expect(queryByTestId(COLLAPSE_DETAILS_BUTTON_TEST_ID)).not.toBeInTheDocument();
  });

  it('should render actions if there are actions available', () => {
    const { getByTestId } = render(
      <ExpandableFlyoutTestProviders>
        <FlyoutNavigation
          flyoutIsExpandable={true}
          expandDetails={expandDetails}
          actions={<div />}
        />
      </ExpandableFlyoutTestProviders>
    );
    expect(getByTestId(EXPAND_DETAILS_BUTTON_TEST_ID)).toBeInTheDocument();
    expect(getByTestId(HEADER_ACTIONS_TEST_ID)).toBeInTheDocument();
  });

  it('should render empty component if panel is not expandable and no action is available', async () => {
    const { container } = render(
      <ExpandableFlyoutTestProviders>
        <FlyoutNavigation flyoutIsExpandable={false} />
      </ExpandableFlyoutTestProviders>
    );
    await act(async () => {
      expect(container).toBeEmptyDOMElement();
    });
  });
});
