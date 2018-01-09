import { MeterGaugeProvider } from './meter';

export function GaugeTypesProvider(Private) {

  return {
    meter: Private(MeterGaugeProvider)
  };
}
