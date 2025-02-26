import { I18nProvider } from '@kbn/i18n-react';
import { ControlSlider } from '../ui/slider_control';

const Template = (args) => (
  <I18nProvider>
    <ControlSlider {...args} />
  </I18nProvider>
);

export default {
  title: 'Random Sampling/Control Slider',
  component: ControlSlider,
};

export const Basic = {
  render: Template.bind({}),
  name: 'basic',

  args: {
    values: [0.00001, 0.0001, 0.001, 0.01, 0.1, 1],
    currentValue: 0.001,
    'data-test-subj': 'test-id',
  },

  argTypes: {
    onChange: {
      action: 'changed',
    },
  },
};

export const Disabled = {
  render: Template.bind({}),
  name: 'disabled',

  args: {
    values: [0.00001, 0.0001, 0.001, 0.01, 0.1, 1],
    currentValue: 0.001,
    disabled: true,
    disabledReason: 'Control was disabled due to X and Y',
    'data-test-subj': 'test-id',
  },

  argTypes: {
    onChange: {
      action: 'changed',
    },
  },
};
