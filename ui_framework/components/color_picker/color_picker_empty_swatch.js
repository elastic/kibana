import React from 'react';

export function KuiColorPickerEmptySwatch() {
  return (
    <div className="kuiColorPicker__swatch kuiColorPicker__emptySwatch">
      <svg>
        <line x1="0" y1="100%" x2="100%" y2="0" />
      </svg>
    </div>
  );
}

