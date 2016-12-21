import MeterGaugeProvider from './meter';

export default function GaugeTypeFactory(Private) {

  return {
    meter: Private(MeterGaugeProvider)
  };
}
