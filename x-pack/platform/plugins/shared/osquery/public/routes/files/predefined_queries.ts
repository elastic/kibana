/*
 * Copyright Elasticsearch B.V. and/or licensed to Elasticsearch B.V. under one
 * or more contributor license agreements. Licensed under the Elastic License
 * 2.0; you may not use this file except in compliance with the Elastic License
 * 2.0.
 */

export interface PredefinedQuery {
  name: string;
  description: string;
  query: string;
  platforms?: string[];
}

export const PREDEFINED_QUERIES: Record<string, PredefinedQuery> = {
  basic_listing: {
    name: 'Basic Directory Listing',
    description: 'List files and directories in the current path',
    query: `SELECT 
  path, filename, size, mtime, type,
  CASE WHEN type = 'directory' THEN 1 ELSE 0 END as is_directory
FROM file 
WHERE directory = '/' -- if this is pre-monitored
ORDER BY is_directory DESC, filename ASC
LIMIT 1000;`,
  },
  
  windows_system_dirs: {
    name: 'Windows System Directories',
    description: 'Browse Windows system directories (Windows, Program Files)',
    query: `SELECT 
      path, 
      filename, 
      size, 
      mtime, 
      type,
      'folder' as file_type
    FROM file 
    WHERE (path LIKE 'C:\\Windows\\%' OR path LIKE 'C:\\Program Files\\%' OR path LIKE 'C:\\Program Files (x86)\\%')
    AND path NOT LIKE 'C:\\Windows\\%\\%\\%'
    AND path NOT LIKE 'C:\\Program Files\\%\\%\\%'
    AND path NOT LIKE 'C:\\Program Files (x86)\\%\\%\\%'
    ORDER BY type DESC, filename ASC 
    LIMIT 1000;`,
    platforms: ['windows'],
  },
  
  linux_system_dirs: {
    name: 'Linux System Directories',
    description: 'Browse Linux system directories (/etc, /var, /home)',
    query: `SELECT 
      path, 
      filename, 
      size, 
      mtime, 
      type,
      CASE 
        WHEN type = 'directory' THEN 'folder'
        ELSE 'file'
      END as file_type
    FROM file 
    WHERE (path LIKE '/etc/%' OR path LIKE '/var/%' OR path LIKE '/home/%' OR path LIKE '/usr/%')
    AND path NOT LIKE '/etc/%/%/%'
    AND path NOT LIKE '/var/%/%/%'
    AND path NOT LIKE '/home/%/%/%'
    AND path NOT LIKE '/usr/%/%/%'
    ORDER BY type DESC, filename ASC 
    LIMIT 1000;`,
    platforms: ['linux'],
  },
  
  executables_with_hashes: {
    name: 'Executable Files with Hashes',
    description: 'Find executable files with their MD5 and SHA256 hashes',
    query: `SELECT 
      f.path, 
      f.filename, 
      f.size, 
      f.mtime, 
      f.type,
      h.md5, 
      h.sha256,
      'file' as file_type
    FROM file f 
    JOIN hash h ON f.path = h.path 
    WHERE (f.filename LIKE '%.exe' OR f.filename LIKE '%.dll' OR f.filename LIKE '%.sys')
    OR (f.mode LIKE '%x%' AND f.type = 'regular')
    ORDER BY f.mtime DESC 
    LIMIT 500;`,
  },
  
  recent_files: {
    name: 'Recently Modified Files',
    description: 'Find files modified in the last 24 hours',
    query: `SELECT 
      path, 
      filename, 
      size, 
      mtime, 
      type,
      'file' as file_type
    FROM file 
    WHERE mtime > (strftime('%s', 'now') - 86400)
    AND type = 'regular'
    ORDER BY mtime DESC 
    LIMIT 1000;`,
  },
  
  large_files: {
    name: 'Large Files',
    description: 'Find files larger than 100MB',
    query: `SELECT 
      path, 
      filename, 
      size, 
      mtime, 
      type,
      'file' as file_type
    FROM file 
    WHERE size > 104857600 
    AND type = 'regular'
    ORDER BY size DESC 
    LIMIT 500;`,
  },
  
  hidden_files: {
    name: 'Hidden Files and Directories',
    description: 'Find hidden files and directories',
    query: `SELECT 
      path, 
      filename, 
      size, 
      mtime, 
      type,
      CASE 
        WHEN type = 'directory' THEN 'folder'
        ELSE 'file'
      END as file_type
    FROM file 
    WHERE filename LIKE '.%' 
    ORDER BY type DESC, filename ASC 
    LIMIT 1000;`,
    platforms: ['linux', 'darwin'],
  },
  
  startup_programs: {
    name: 'Startup Programs (Windows)',
    description: 'Find programs in Windows startup locations',
    query: `SELECT 
      path, 
      filename, 
      size, 
      mtime, 
      type,
      'file' as file_type
    FROM file 
    WHERE (
      path LIKE 'C:\\Users\\%\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\%'
      OR path LIKE 'C:\\ProgramData\\Microsoft\\Windows\\Start Menu\\Programs\\Startup\\%'
      OR path LIKE 'C:\\Users\\%\\AppData\\Roaming\\Microsoft\\Windows\\Start Menu\\Programs\\StartUp\\%'
    )
    ORDER BY mtime DESC 
    LIMIT 100;`,
    platforms: ['windows'],
  },
};

export const getQueryForPath = (queryType: string, path: string): string => {
  const query = PREDEFINED_QUERIES[queryType];
  if (!query) {
    return PREDEFINED_QUERIES.basic_listing.query.replace('{path}', path);
  }
  
  return query.query.replace(/\{path\}/g, path);
};

export const getPlatformQueries = (platform?: string): Record<string, PredefinedQuery> => {
  if (!platform) {
    return PREDEFINED_QUERIES;
  }
  
  return Object.entries(PREDEFINED_QUERIES).reduce((acc, [key, query]) => {
    if (!query.platforms || query.platforms.includes(platform.toLowerCase())) {
      acc[key] = query;
    }
    return acc;
  }, {} as Record<string, PredefinedQuery>);
};
