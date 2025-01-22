/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

/* @notice
 * This product includes code that is adapted from mapbox-gl-js, which is
 * available under a "BSD-3-Clause" license.
 * https://github.com/mapbox/mapbox-gl-js/blob/v1.13.2/src/util/image.js
 *
 * Copyright (c) 2016, Mapbox
 *
 * All rights reserved.
 *
 * Redistribution and use in source and binary forms, with or without modification,
 * are permitted provided that the following conditions are met:
 *
 *     * Redistributions of source code must retain the above copyright notice,
 *       this list of conditions and the following disclaimer.
 *     * Redistributions in binary form must reproduce the above copyright notice,
 *       this list of conditions and the following disclaimer in the documentation
 *       and/or other materials provided with the distribution.
 *     * Neither the name of Mapbox GL JS nor the names of its contributors
 *       may be used to endorse or promote products derived from this software
 *       without specific prior written permission.
 *
 * THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS
 * "AS IS" AND ANY EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT
 * LIMITED TO, THE IMPLIED WARRANTIES OF MERCHANTABILITY AND FITNESS FOR
 * A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT SHALL THE COPYRIGHT OWNER OR
 * CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT, INCIDENTAL, SPECIAL,
 * EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED TO,
 * PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR
 * PROFITS; OR BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF
 * LIABILITY, WHETHER IN CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING
 * NEGLIGENCE OR OTHERWISE) ARISING IN ANY WAY OUT OF THE USE OF THIS
 * SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH DAMAGE.
 */

import assert from 'assert';

function createImage(image, { width, height }, channels, data) {
  if (!data) {
    data = new Uint8Array(width * height * channels);
  } else if (data instanceof Uint8ClampedArray) {
    data = new Uint8Array(data.buffer);
  } else if (data.length !== width * height * channels) {
    throw new RangeError('mismatched image size');
  }
  image.width = width;
  image.height = height;
  image.data = data;
  return image;
}

function resizeImage(image, { width, height }, channels) {
  if (width === image.width && height === image.height) {
    return;
  }

  const newImage = createImage({}, { width, height }, channels);

  copyImage(
    image,
    newImage,
    { x: 0, y: 0 },
    { x: 0, y: 0 },
    {
      width: Math.min(image.width, width),
      height: Math.min(image.height, height),
    },
    channels
  );

  image.width = width;
  image.height = height;
  image.data = newImage.data;
}

function copyImage(srcImg, dstImg, srcPt, dstPt, size, channels) {
  if (size.width === 0 || size.height === 0) {
    return dstImg;
  }

  if (
    size.width > srcImg.width ||
    size.height > srcImg.height ||
    srcPt.x > srcImg.width - size.width ||
    srcPt.y > srcImg.height - size.height
  ) {
    throw new RangeError('out of range source coordinates for image copy');
  }

  if (
    size.width > dstImg.width ||
    size.height > dstImg.height ||
    dstPt.x > dstImg.width - size.width ||
    dstPt.y > dstImg.height - size.height
  ) {
    throw new RangeError('out of range destination coordinates for image copy');
  }

  const srcData = srcImg.data;
  const dstData = dstImg.data;

  assert(srcData !== dstData);

  for (let y = 0; y < size.height; y++) {
    const srcOffset = ((srcPt.y + y) * srcImg.width + srcPt.x) * channels;
    const dstOffset = ((dstPt.y + y) * dstImg.width + dstPt.x) * channels;
    for (let i = 0; i < size.width * channels; i++) {
      dstData[dstOffset + i] = srcData[srcOffset + i];
    }
  }

  return dstImg;
}

export class AlphaImage {
  constructor(size, data) {
    createImage(this, size, 1, data);
  }

  resize(size) {
    resizeImage(this, size, 1);
  }

  clone() {
    return new AlphaImage({ width: this.width, height: this.height }, new Uint8Array(this.data));
  }

  static copy(srcImg, dstImg, srcPt, dstPt, size) {
    copyImage(srcImg, dstImg, srcPt, dstPt, size, 1);
  }
}

// Not premultiplied, because ImageData is not premultiplied.
// UNPACK_PREMULTIPLY_ALPHA_WEBGL must be used when uploading to a texture.
export class RGBAImage {
  // data must be a Uint8Array instead of Uint8ClampedArray because texImage2D does not
  // support Uint8ClampedArray in all browsers

  constructor(size, data) {
    createImage(this, size, 4, data);
  }

  resize(size) {
    resizeImage(this, size, 4);
  }

  replace(data, copy) {
    if (copy) {
      this.data.set(data);
    } else if (data instanceof Uint8ClampedArray) {
      this.data = new Uint8Array(data.buffer);
    } else {
      this.data = data;
    }
  }

  clone() {
    return new RGBAImage({ width: this.width, height: this.height }, new Uint8Array(this.data));
  }

  static copy(srcImg, dstImg, srcPt, dstPt, size) {
    copyImage(srcImg, dstImg, srcPt, dstPt, size, 4);
  }
}
