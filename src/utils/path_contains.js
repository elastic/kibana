import { relative } from 'path';

export default function pathContains(root, child) {
  return relative(child, root).slice(0, 2) !== '..';
}
