# @kbn/fs

A secure file system package that restricts file operations to the data directory with built-in validations and sanitizations.

## Overview

`@kbn/fs` provides a safe way to read and write files in Kibana by enforcing strict security boundaries. All file operations are automatically restricted to the data directory, with comprehensive validations and sanitizations applied out of the box.

**⚠️ Important**: This package is intended for **runtime production code only**. Do not use it in CI pipelines, build scripts, or other development tooling.

This package provides a limited set of file system functions (no `openSync`, `mkdir`, etc.) because we discourage the use of file system operations in production code in general. Only use this package when file system access is absolutely necessary.

## Features

- **Directory Restriction**: All file operations are automatically scoped to the data directory
- **Path Traversal Protection**: Prevents directory traversal attacks (e.g., `../` attempts)
- **File Type Validation**: Only allows specific file extensions and MIME types
- **File Size Limits**: Enforces maximum file size (1GB)
- **Content Sanitization**: Automatically sanitizes SVG files
- **Volume Support**: Organize files into subdirectories using volumes

## Usage

### Basic File Operations

```typescript
import { writeFile, readFile, deleteFile } from '@kbn/fs';

// Write a file
const metadata = await writeFile('my-file.json', JSON.stringify({ data: 'value' }));
console.log(metadata.path); // Full path to the file
console.log(metadata.alias); // Alias: 'disk:data/my-file.json'

// Read a file
const content = await readFile('my-file.json');

// Delete a file
await deleteFile('my-file.json');
```

### Using Volumes

Volumes allow you to organize files into subdirectories within the data directory:

```typescript
// Write to a volume
await writeFile('report.csv', csvData, { volume: 'reports' });
// File is written to: data/reports/report.csv
// Alias: 'disk:data/reports/report.csv'

// Read from a volume
const report = await readFile('report.csv', 'reports');
```

### Synchronous Operations

Synchronous versions are also available:

```typescript
import { writeFileSync, readFileSync, deleteFileSync } from '@kbn/fs';

writeFileSync('file.txt', 'content');
const content = readFileSync('file.txt');
deleteFileSync('file.txt');
```

### Streaming

For large files, you can use streams:

```typescript
import { createWriteStream, createReadStream } from '@kbn/fs';

// Write stream
const writeStream = createWriteStream('large-file.log', 'logs');
writeStream.write('log entry\n');
writeStream.end();

// Read stream
const readStream = createReadStream('large-file.log', 'logs');
readStream.pipe(process.stdout);
```

### Appending to Files

```typescript
import { appendFile, appendFileSync } from '@kbn/fs';

await appendFile('log.txt', 'new log entry\n');
appendFileSync('log.txt', 'another entry\n');
```

## When NOT to Use This Package

This package should **NOT** be used in:
- CI/CD pipelines
- Build scripts
- Development tooling
- Test utilities (unless testing the package itself)
- Migration scripts
- Any non-runtime code

Use Node.js's native `fs` module or other appropriate file system utilities for these cases.
