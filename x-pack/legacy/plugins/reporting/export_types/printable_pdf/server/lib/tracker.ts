/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

import apm from 'elastic-apm-node';

interface PdfTracker {
  startLayout: () => void;
  endLayout: () => void;
  startScreenshots: () => void;
  endScreenshots: () => void;
  startSetup: () => void;
  endSetup: () => void;
  startAddImage: () => void;
  endAddImage: () => void;
  startCompile: () => void;
  endCompile: () => void;
  startGetBuffer: () => void;
  endGetBuffer: () => void;
  end: () => void;
}

const SPANTYPE_SETUP = 'setup';
const SPANTYPE_OUTPUT = 'output';

export function getTracker(): PdfTracker {
  const apmTrans = apm.startTransaction('reporting generate_pdf', 'reporting');

  let apmLayout: Date;
  let apmScreenshots: any;
  let apmSetup: any;
  let apmAddImage: any;
  let apmCompilePdf: any;
  let apmGetBuffer: any;

  return {
    startLayout() {
      apmLayout = apmTrans?.startSpan('create_layout', SPANTYPE_SETUP);
    },
    endLayout() {
      if (apmLayout) apmLayout.end();
    },
    startScreenshots() {
      apmScreenshots = apmTrans?.startSpan('screenshots_pipeline', SPANTYPE_SETUP);
    },
    endScreenshots() {
      if (apmScreenshots) apmScreenshots.end();
    },
    startSetup() {
      apmSetup = apmTrans?.startSpan('setup_pdf', SPANTYPE_SETUP);
    },
    endSetup() {
      if (apmSetup) apmSetup.end();
    },
    startAddImage() {
      apmAddImage = apmTrans?.startSpan('add_pdf_image', SPANTYPE_OUTPUT);
    },
    endAddImage() {
      if (apmAddImage) apmAddImage.end();
    },
    startCompile() {
      apmCompilePdf = apmTrans?.startSpan('compile_pdf', SPANTYPE_OUTPUT);
    },
    endCompile() {
      if (apmCompilePdf) apmCompilePdf.end();
    },
    startGetBuffer() {
      apmGetBuffer = apmTrans?.startSpan('get_buffer', SPANTYPE_OUTPUT);
    },
    endGetBuffer() {
      if (apmGetBuffer) apmGetBuffer.end();
    },
    end() {
      if (apmTrans) apmTrans.end();
    },
  };
}
