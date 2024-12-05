import React, { useRef } from 'react'
import { render } from '@testing-library/react';
import { AssistantNavLink } from './assistant_nav_link';
import { chromeServiceMock } from '@kbn/core-chrome-browser-mocks';

const mockShowAssistantOverlay = jest.fn();

describe('AssistantNavLink', () => {
    beforeEach(() => {
        jest.clearAllMocks();
    });

    it('should register link in nav bar', () => {
        const chromeMock = chromeServiceMock.createStartContract();

        render(
            <>
                <AssistantNavLink hasAssistantPrivilege showAssistantOverlay={mockShowAssistantOverlay} navControls={chromeMock.navControls} />
            </>);
        expect(chromeMock.navControls.registerRight).toHaveBeenCalledTimes(1)
    });

    it('should render the header link text', () => {
        const chromeMock = chromeServiceMock.createStartContract();

        const { queryByText, queryByTestId } = render(<AssistantNavLink hasAssistantPrivilege showAssistantOverlay={mockShowAssistantOverlay} navControls={chromeMock.navControls} />);
        expect(queryByTestId('assistantNavLink')).toBeInTheDocument();
        expect(queryByText('AI Assistant')).toBeInTheDocument();
    });

    it('should not render the header link if not authorized', () => {
        const chromeMock = chromeServiceMock.createStartContract();

        const { queryByText, queryByTestId } = render(<AssistantNavLink hasAssistantPrivilege={false} showAssistantOverlay={mockShowAssistantOverlay} navControls={chromeMock.navControls} />);
        expect(queryByTestId('assistantNavLink')).not.toBeInTheDocument();
        expect(queryByText('AI Assistant')).not.toBeInTheDocument();
    });

    it('should call the assistant overlay to show on click', () => {
        const chromeMock = chromeServiceMock.createStartContract();

        const { queryByTestId } = render(<AssistantNavLink hasAssistantPrivilege showAssistantOverlay={mockShowAssistantOverlay} navControls={chromeMock.navControls} />);
        queryByTestId('assistantNavLink')?.click();
        expect(mockShowAssistantOverlay).toHaveBeenCalledTimes(1);
        expect(mockShowAssistantOverlay).toHaveBeenCalledWith({ showOverlay: true });
    });
})