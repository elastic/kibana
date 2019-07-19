//import { isValidHex } from '../../services';
import { isValidHex } from '@elastic/eui';

export const removeRow = (colorStops, index) => {
  if (colorStops.length === 1) {
    return colorStops;
  }

  return [...colorStops.slice(0, index), ...colorStops.slice(index + 1)];
};

export const addRow = (colorStops, index) => {
  const currentStop = colorStops[index].stop;
  let delta = 1;
  if (index === colorStops.length - 1) {
    // Adding row to end of list.
    if (index !== 0) {
      const prevStop = colorStops[index - 1].stop;
      delta = currentStop - prevStop;
    }
  } else {
    // Adding row in middle of list.
    const nextStop = colorStops[index + 1].stop;
    delta = (nextStop - currentStop) / 2;
  }

  const newRow = {
    stop: currentStop + delta,
    color: '#FF0000',
  };
  return [
    ...colorStops.slice(0, index + 1),
    newRow,
    ...colorStops.slice(index + 1),
  ];
};

export const isColorInvalid = color => {
  return !isValidHex(color) || color === '';
};

export const isStopInvalid = stop => {
  return stop === '' || isNaN(stop);
};

export const isInvalid = colorStops => {
  return colorStops.some((colorStop, index) => {
    // expect stops to be in ascending order
    let isDescending = false;
    if (index !== 0) {
      const prevStop = colorStops[index - 1].stop;
      isDescending = prevStop >= colorStop.stop;
    }

    return (
      isColorInvalid(colorStop.color) ||
      isStopInvalid(colorStop.stop) ||
      isDescending
    );
  });
};
