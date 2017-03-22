import dateMath from '@elastic/datemath';
export default function () {

  const unitsDesc = dateMath.unitsDesc;
  const largeMax = unitsDesc.indexOf('M');

  /**
   * Convert a moment.duration into an es
   * compatible expression, and provide
   * associated metadata
   *
   * @param  {moment.duration} duration
   * @return {object}
   */
  function esDuration(duration) {
    for (let i = 0; i < unitsDesc.length; i++) {
      const unit = unitsDesc[i];
      const val = duration.as(unit);
      // find a unit that rounds neatly
      if (val >= 1 && Math.floor(val) === val) {

        // if the unit is "large", like years, but
        // isn't set to 1 ES will puke. So keep going until
        // we get out of the "large" units
        if (i <= largeMax && val !== 1) {
          continue;
        }

        return {
          value: val,
          unit: unit,
          expression: val + unit
        };
      }
    }

    const ms = duration.as('ms');
    return {
      value: ms,
      unit: 'ms',
      expression: ms + 'ms'
    };
  }


  return esDuration;
}
