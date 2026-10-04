import { useEuiTheme } from '@elastic/eui';

const INFO_BLOCKS_MIN_CELL_WIDTH = 140;
const INFO_BLOCKS_COLUMNS = 4;

export const useAlertDetailsFlyoutWidth = () => {
  const { euiTheme } = useEuiTheme();

  return INFO_BLOCKS_COLUMNS * INFO_BLOCKS_MIN_CELL_WIDTH + euiTheme.base * 2;
};
