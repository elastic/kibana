/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the "Elastic License
 * 2.0", the "GNU Affero General Public License v3.0 only", and the "Server Side
 * Public License v 1"; you may not use this file except in compliance with, at
 * your election, the "Elastic License 2.0", the "GNU Affero General Public
 * License v3.0 only", or the "Server Side Public License, v 1".
 */

declare module 'ink' {
  export type { Instance, RenderOptions } from 'ink/build/index';
  export { render } from 'ink/build/index';

  export type { BoxProps } from 'ink/build/index';
  export { Box } from 'ink/build/index';

  export type { TextProps } from 'ink/build/index';
  export { Text } from 'ink/build/index';

  export type { AppProps } from 'ink/build/index';
  export type { StdinProps } from 'ink/build/index';
  export type { StdoutProps } from 'ink/build/index';
  export type { StderrProps } from 'ink/build/index';
  export type { StaticProps } from 'ink/build/index';
  export { Static } from 'ink/build/index';

  export type { TransformProps } from 'ink/build/index';
  export { Transform } from 'ink/build/index';

  export type { NewlineProps } from 'ink/build/index';
  export { Newline, Spacer } from 'ink/build/index';

  export type { Key } from 'ink/build/index';
  export {
    measureElement,
    useApp,
    useFocus,
    useFocusManager,
    useInput,
    useStderr,
    useStdin,
    useStdout,
  } from 'ink/build/index';

  export type { DOMElement } from 'ink/build/index';
}
