/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License;
 * you may not use this file except in compliance with the Elastic License.
 */

// Pulled from Ace because I can't for the life of me
// figure out how to import it.  This needs to be fixed TODO

const comparePoints = function(p1, p2) {
  return p1.row - p2.row || p1.column - p2.column;
};

export function Range(startRow, startColumn, endRow, endColumn) {
  this.start = {
    row: startRow,
    column: startColumn,
  };

  this.end = {
    row: endRow,
    column: endColumn,
  };
}

(function() {
  this.isEqual = function(range) {
    return (
      this.start.row === range.start.row &&
      this.end.row === range.end.row &&
      this.start.column === range.start.column &&
      this.end.column === range.end.column
    );
  };
  this.toString = function() {
    return (
      'Range: [' +
      this.start.row +
      '/' +
      this.start.column +
      '] -> [' +
      this.end.row +
      '/' +
      this.end.column +
      ']'
    );
  };

  this.contains = function(row, column) {
    return this.compare(row, column) === 0;
  };
  this.compareRange = function(range) {
    let cmp;
    const end = range.end;
    const start = range.start;

    cmp = this.compare(end.row, end.column);
    if (cmp === 1) {
      cmp = this.compare(start.row, start.column);
      if (cmp === 1) {
        return 2;
      } else if (cmp === 0) {
        return 1;
      } else {
        return 0;
      }
    } else if (cmp === -1) {
      return -2;
    } else {
      cmp = this.compare(start.row, start.column);
      if (cmp === -1) {
        return -1;
      } else if (cmp === 1) {
        return 42;
      } else {
        return 0;
      }
    }
  };
  this.comparePoint = function(p) {
    return this.compare(p.row, p.column);
  };
  this.containsRange = function(range) {
    return this.comparePoint(range.start) === 0 && this.comparePoint(range.end) === 0;
  };
  this.intersects = function(range) {
    const cmp = this.compareRange(range);
    return cmp === -1 || cmp === 0 || cmp === 1;
  };
  this.isEnd = function(row, column) {
    return this.end.row === row && this.end.column === column;
  };
  this.isStart = function(row, column) {
    return this.start.row === row && this.start.column === column;
  };
  this.setStart = function(row, column) {
    if (typeof row === 'object') {
      this.start.column = row.column;
      this.start.row = row.row;
    } else {
      this.start.row = row;
      this.start.column = column;
    }
  };
  this.setEnd = function(row, column) {
    if (typeof row === 'object') {
      this.end.column = row.column;
      this.end.row = row.row;
    } else {
      this.end.row = row;
      this.end.column = column;
    }
  };
  this.inside = function(row, column) {
    if (this.compare(row, column) === 0) {
      if (this.isEnd(row, column) || this.isStart(row, column)) {
        return false;
      } else {
        return true;
      }
    }
    return false;
  };
  this.insideStart = function(row, column) {
    if (this.compare(row, column) === 0) {
      if (this.isEnd(row, column)) {
        return false;
      } else {
        return true;
      }
    }
    return false;
  };
  this.insideEnd = function(row, column) {
    if (this.compare(row, column) === 0) {
      if (this.isStart(row, column)) {
        return false;
      } else {
        return true;
      }
    }
    return false;
  };
  this.compare = function(row, column) {
    if (!this.isMultiLine()) {
      if (row === this.start.row) {
        if (column < this.start.column) {
          return -1;
        }
        return column > this.end.column ? 1 : 0;
      }
    }

    if (row < this.start.row) {
      return -1;
    }

    if (row > this.end.row) {
      return 1;
    }

    if (this.start.row === row) {
      return column >= this.start.column ? 0 : -1;
    }

    if (this.end.row === row) {
      return column <= this.end.column ? 0 : 1;
    }

    return 0;
  };
  this.compareStart = function(row, column) {
    if (this.start.row === row && this.start.column === column) {
      return -1;
    } else {
      return this.compare(row, column);
    }
  };
  this.compareEnd = function(row, column) {
    if (this.end.row === row && this.end.column === column) {
      return 1;
    } else {
      return this.compare(row, column);
    }
  };
  this.compareInside = function(row, column) {
    if (this.end.row === row && this.end.column === column) {
      return 1;
    } else if (this.start.row === row && this.start.column === column) {
      return -1;
    } else {
      return this.compare(row, column);
    }
  };
  this.clipRows = function(firstRow, lastRow) {
    let end;
    let start;
    if (this.end.row > lastRow) {
      end = { row: lastRow + 1, column: 0 };
    } else if (this.end.row < firstRow) {
      end = { row: firstRow, column: 0 };
    }

    if (this.start.row > lastRow) {
      start = { row: lastRow + 1, column: 0 };
    } else if (this.start.row < firstRow) {
      start = { row: firstRow, column: 0 };
    }
    return Range.fromPoints(start || this.start, end || this.end);
  };
  this.extend = function(row, column) {
    const cmp = this.compare(row, column);

    if (cmp === 0) {
      return this;
    }
    let start;
    let end;
    if (cmp === -1) {
      start = { row: row, column: column };
    } else {
      end = { row: row, column: column };
    }
    return Range.fromPoints(start || this.start, end || this.end);
  };

  this.isEmpty = function() {
    return this.start.row === this.end.row && this.start.column === this.end.column;
  };
  this.isMultiLine = function() {
    return this.start.row !== this.end.row;
  };
  this.clone = function() {
    return Range.fromPoints(this.start, this.end);
  };
  this.collapseRows = function() {
    if (this.end.column === 0) {
      return new Range(this.start.row, 0, Math.max(this.start.row, this.end.row - 1), 0);
    }
    return new Range(this.start.row, 0, this.end.row, 0);
  };
  this.toScreenRange = function(session) {
    const screenPosStart = session.documentToScreenPosition(this.start);
    const screenPosEnd = session.documentToScreenPosition(this.end);

    return new Range(
      screenPosStart.row,
      screenPosStart.column,
      screenPosEnd.row,
      screenPosEnd.column
    );
  };
  this.moveBy = function(row, column) {
    this.start.row += row;
    this.start.column += column;
    this.end.row += row;
    this.end.column += column;
  };
}.call(Range.prototype));
Range.fromPoints = function(start, end) {
  return new Range(start.row, start.column, end.row, end.column);
};
Range.comparePoints = comparePoints;

Range.comparePoints = function(p1, p2) {
  return p1.row - p2.row || p1.column - p2.column;
};
