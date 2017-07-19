import { MeterGaugeProvider } from './meter';
import { SimpleGaugeProvider } from './simple';

export function GaugeTypesProvider(Private) {

  return {
    meter: Private(MeterGaugeProvider),
    simple: Private(SimpleGaugeProvider),
  };
}
