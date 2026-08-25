/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React from 'react';
import { SideCarFilePicker } from './side_car_file_picker';

interface Props {
  shapefileName: string;
  onDbfSelect: (file: File | null) => void;
  onPrjSelect: (file: File | null) => void;
  onShxSelect: (file: File | null) => void;
}

export function ShapefileEditor(props: Props) {
  return (
    <>
      <SideCarFilePicker
        ext=".dbf"
        onSelect={props.onDbfSelect}
        shapefileName={props.shapefileName}
      />
      <SideCarFilePicker
        ext=".prj"
        onSelect={props.onPrjSelect}
        shapefileName={props.shapefileName}
      />
      <SideCarFilePicker
        ext=".shx"
        onSelect={props.onShxSelect}
        shapefileName={props.shapefileName}
      />
    </>
  );
}
