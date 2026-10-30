/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/**
 * Custom color scale factory that takes the amount of feature influencers
 * into account to adjust the contrast of the color range. This is used for
 * color coding for outlier detection where the amount of feature influencers
 * affects the threshold from which the influencers value can actually be
 * considered influential.
 *
 * @param n number of influencers
 * @returns a function suitable as a preprocessor for d3.scale.linear()
 */
export const influencerColorScaleFactory = (n: number) => (t: number) => {
  // for 1 influencer or less we fall back to a plain linear scale.
  if (n <= 1) {
    return t;
  }

  if (t < 1 / n) {
    return 0;
  }
  if (t < 3 / n) {
    return (n / 4) * (t - 1 / n);
  }
  return 0.5 + (t - 3 / n);
};
