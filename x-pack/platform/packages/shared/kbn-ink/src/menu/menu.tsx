/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

import React, { useEffect, useState } from 'react';
import { Box, Text, useInput } from 'ink';

export interface MenuItemProps {
  id?: string;
  label: string;
  description?: string;
}

export const MenuItem: React.FC<MenuItemProps> = () => null; // Placeholder; real rendering handled by Menu.

interface MenuProps {
  label: string;
  items: MenuItemProps[];
  onSelect: (item: MenuItemProps) => void;
  onBack: () => void;
}

/**
 * Displays a simple menu that is controllable by keyboard.
 */
export function Menu({ label, items, onSelect, onBack }: MenuProps) {
  const [selectedItem, setSelectedItem] = useState<MenuItemProps | undefined>(items[0]);

  useInput((input, key) => {
    if (key.upArrow || key.downArrow) {
      setSelectedItem((prevItem) => {
        const indexOfPreviousItem = prevItem ? items.indexOf(prevItem) : -1;
        if (key.upArrow) {
          return items[indexOfPreviousItem > 0 ? indexOfPreviousItem - 1 : items.length - 1];
        }

        return items[indexOfPreviousItem < items.length - 1 ? indexOfPreviousItem + 1 : 0];
      });
    } else if (key.return && selectedItem) {
      onSelect(selectedItem);
    } else if (input === 'q') {
      onBack();
    }
  });

  useEffect(() => {
    if (!selectedItem || items.indexOf(selectedItem) === -1) {
      setSelectedItem(items[0]);
    }
  }, [items, setSelectedItem, selectedItem]);

  return (
    <Box flexDirection="column">
      {label && (
        <Box marginBottom={1}>
          <Text bold>{label}</Text>
        </Box>
      )}
      {items.map((item) => (
        <Box key={item.label}>
          <Text color={item === selectedItem ? 'cyan' : undefined}>
            {item === selectedItem ? '→ ' : '  '}
            {item.label}
            {item.description && <Text dimColor> - {item.description}</Text>}
          </Text>
        </Box>
      ))}
      <Box marginTop={1}>
        <Text dimColor>↑/↓: Navigate | Enter: Select | q: Back</Text>
      </Box>
    </Box>
  );
}
