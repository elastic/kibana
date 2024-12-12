import React, { ComponentProps } from 'react';
import { HeatmapToolbar } from './toolbar_component';
import { fireEvent, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';

type Props = ComponentProps<typeof HeatmapToolbar>;

const defaultProps: Props = {};

const renderComponent = (props: Partial<Props> = {}) => {
  const user = userEvent.setup({ advanceTimers: jest.advanceTimersByTime });
  const renderResult = render(<HeatmapToolbar {...defaultProps} {...props} />);

  await user.click(screen.getByRole('button'));

  return {
    renderer: renderResult,
  };
};

describe('HeatmapToolbar', () => {
  it('should have selected the horizontal option on the orientation group', async () => {
    const result = await renderComponent({
      useMultilayerTimeAxis: false,
      areTickLabelsVisible: true,
    });
    expect(result.orientation.selected).not.toBeChecked();
  });

  it('should have called the setOrientation function on orientation button group change', async () => {
    const result = await renderAxisSettingsPopover({
      useMultilayerTimeAxis: false,
      areTickLabelsVisible: true,
    });
    result.orientation.select('Angled');
    expect(defaultProps.setOrientation).toHaveBeenCalled();
  });

  it('should hide the orientation group if the tickLabels are set to not visible', async () => {
    const result = await renderAxisSettingsPopover({
      useMultilayerTimeAxis: false,
      areTickLabelsVisible: false,
    });
    expect(result.orientation.self).not.toBeInTheDocument();
  });
});
