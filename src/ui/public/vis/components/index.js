import TooltipProvider from './tooltip';
import ColorProvider from './color';

export default function ComponentsProvider(Private) {
  return {
    tooltip: Private(TooltipProvider),
    colors: Private(ColorProvider)
  };
}
