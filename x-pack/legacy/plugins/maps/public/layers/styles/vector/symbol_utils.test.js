/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import { getMakiSymbolSvg, styleSvg } from './symbol_utils';

describe('getMakiSymbolSvg', () => {
  it('Should load symbol svg', () => {
    const svgString = getMakiSymbolSvg('aerialway');
    expect(svgString.length).toBe(624);
  });
});

describe('styleSvg', () => {
  it('Should not add style property when style not provided', async () => {
    const unstyledSvgString =
      '<svg version="1.1" width="11px" height="11px" viewBox="0 0 11 11"><path/></svg>';
    const styledSvg = await styleSvg(unstyledSvgString);
    expect(styledSvg.split('\n')[1]).toBe(
      '<svg version="1.1" width="11px" height="11px" viewBox="0 0 11 11">'
    );
  });

  it('Should add fill style property to svg element', async () => {
    const unstyledSvgString =
      '<svg version="1.1" width="11px" height="11px" viewBox="0 0 11 11"><path/></svg>';
    const styledSvg = await styleSvg(unstyledSvgString, 'red');
    // eslint-disable-next-line max-len
    expect(styledSvg.split('\n')[1]).toBe(
      '<svg version="1.1" width="11px" height="11px" viewBox="0 0 11 11" style="fill:red;">'
    );
  });

  it('Should add stroke style property to svg element', async () => {
    const unstyledSvgString =
      '<svg version="1.1" width="11px" height="11px" viewBox="0 0 11 11"><path/></svg>';
    const styledSvg = await styleSvg(unstyledSvgString, 'red', 'white');
    // eslint-disable-next-line max-len
    expect(styledSvg.split('\n')[1]).toBe(
      '<svg version="1.1" width="11px" height="11px" viewBox="0 0 11 11" style="fill:red;stroke:white;">'
    );
  });

  it('Should add stroke-width style property to svg element', async () => {
    const unstyledSvgString =
      '<svg version="1.1" width="11px" height="11px" viewBox="0 0 11 11"><path/></svg>';
    const styledSvg = await styleSvg(unstyledSvgString, 'red', 'white', '2px');
    // eslint-disable-next-line max-len
    expect(styledSvg.split('\n')[1]).toBe(
      '<svg version="1.1" width="11px" height="11px" viewBox="0 0 11 11" style="fill:red;stroke:white;stroke-width:2px;">'
    );
  });
});
