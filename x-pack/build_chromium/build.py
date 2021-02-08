import os, subprocess, sys, platform, zipfile, hashlib, shutil
from os import path
from build_util import (
  runcmd,
  runcmdsilent,
  mkdir,
  md5_file,
  configure_environment,
)

# This file builds Chromium headless on Windows, Mac, and Linux.

# Verify that we have an argument, and if not print instructions
if (len(sys.argv) < 2):
  print('Usage:')
  print('python build.py {chromium_version} [arch_name]')
  print('Example:')
  print('python build.py 68.0.3440.106')
  print('python build.py 4747cc23ae334a57a35ed3c8e6adcdbc8a50d479')
  print('python build.py 4747cc23ae334a57a35ed3c8e6adcdbc8a50d479 arm64 # build for ARM architecture')
  print
  sys.exit(1)

src_path = path.abspath(path.join(os.curdir, 'chromium', 'src'))
build_path = path.abspath(path.join(src_path, '..', '..'))
build_chromium_path = path.abspath(path.dirname(__file__))
argsgn_file = path.join(build_chromium_path, platform.system().lower(), 'args.gn')

# The version of Chromium we wish to build. This can be any valid git
# commit, tag, or branch, so: 68.0.3440.106 or
# 4747cc23ae334a57a35ed3c8e6adcdbc8a50d479
source_version = sys.argv[1]
base_version = source_version[:7].strip('.')

# Set to "arm" to build for ARM on Linux
arch_name = sys.argv[2] if len(sys.argv) >= 3 else 'unknown'

if arch_name != 'x64' and arch_name != 'arm64':
  raise Exception('Unexpected architecture: ' + arch_name + '. `x64` and `arm64` are supported.')

print('Building Chromium ' + source_version + ' for ' + arch_name + ' from ' + src_path)
print('src path: ' + src_path)
print('depot_tools path: ' + path.join(build_path, 'depot_tools'))
print('build_chromium_path: ' + build_chromium_path)
print('args.gn file: ' + argsgn_file)
print

# Sync the codebase to the correct version
print('Setting local tracking branch')
print(' > cd ' + src_path)
os.chdir(src_path)

checked_out = runcmdsilent('git checkout build-' + base_version)
if checked_out != 0:
  print('Syncing remote version')
  runcmd('git fetch origin ' + source_version)
  print('Creating a new branch for tracking the source version')
  runcmd('git checkout -b build-' + base_version + ' ' + source_version)

depot_tools_path = os.path.join(build_path, 'depot_tools')
path_value = depot_tools_path + os.pathsep + os.environ['PATH']
print('Updating PATH for depot_tools: ' + path_value)
os.environ['PATH'] = path_value
print('Updating all modules')
runcmd('gclient sync')

# Copy build args/{Linux | Darwin | Windows}.gn from the root of our directory to out/headless/args.gn,
argsgn_destination = path.abspath('out/headless/args.gn')
print('Generating platform-specific args')
mkdir('out/headless')
print(' > cp ' + argsgn_file + ' ' + argsgn_destination)
shutil.copyfile(argsgn_file, argsgn_destination)

print('Adding target_cpu to args')

f = open('out/headless/args.gn', 'a')
f.write('\rtarget_cpu = "' + arch_name + '"\r')
f.close()

runcmd('gn gen out/headless')

# Build Chromium... this takes *forever* on underpowered VMs
print('Compiling... this will take a while')
runcmd('autoninja -C out/headless headless_shell')

# Optimize the output on Linux x64 and Mac by stripping inessentials from the binary
# ARM must be cross-compiled from Linux and can not read the ARM binary in order to strip
if platform.system() != 'Windows' and arch_name != 'arm64':
  print('Optimizing headless_shell')
  shutil.move('out/headless/headless_shell', 'out/headless/headless_shell_raw')
  runcmd('strip -o out/headless/headless_shell out/headless/headless_shell_raw')

# Create the zip and generate the md5 hash using filenames like:
# chromium-4747cc2-linux_x64.zip
base_filename = 'out/headless/chromium-' + base_version + '-' + platform.system().lower() + '_' + arch_name
zip_filename = base_filename + '.zip'
md5_filename = base_filename + '.md5'

print('Creating '  + path.join(src_path, zip_filename))
archive = zipfile.ZipFile(zip_filename, mode='w', compression=zipfile.ZIP_DEFLATED)

def archive_file(name):
  """A little helper function to write individual files to the zip file"""
  from_path = path.join('out/headless', name)
  to_path = path.join('headless_shell-' + platform.system().lower() + '_' + arch_name, name)
  archive.write(from_path, to_path)
  return to_path

# Each platform has slightly different requirements for what dependencies
# must be bundled with the Chromium executable.
if platform.system() == 'Linux':
  archive_file('headless_shell')
  archive_file(path.join('swiftshader', 'libEGL.so'))
  archive_file(path.join('swiftshader', 'libGLESv2.so'))

  if arch_name == 'arm64':
    archive_file(path.join('swiftshader', 'libEGL.so'))

elif platform.system() == 'Windows':
  archive_file('headless_shell.exe')
  archive_file('dbghelp.dll')
  archive_file('icudtl.dat')
  archive_file(path.join('swiftshader', 'libEGL.dll'))
  archive_file(path.join('swiftshader', 'libEGL.dll.lib'))
  archive_file(path.join('swiftshader', 'libGLESv2.dll'))
  archive_file(path.join('swiftshader', 'libGLESv2.dll.lib'))

elif platform.system() == 'Darwin':
  archive_file('headless_shell')
  archive_file('libswiftshader_libEGL.dylib')
  archive_file('libswiftshader_libGLESv2.dylib')
  archive_file(path.join('Helpers', 'chrome_crashpad_handler'))

archive.close()

print('Creating ' + path.join(src_path, md5_filename))
with open (md5_filename, 'w') as f:
  f.write(md5_file(zip_filename))
