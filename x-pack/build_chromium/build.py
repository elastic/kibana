import os, subprocess, sys, platform, zipfile, hashlib, shutil
from os import path
from build_util import (
  runcmd,
  runcmdsilent,
  md5_file,
)

# This file builds Chromium headless on Linux.

# Verify that we have an argument, and if not print instructions
if (len(sys.argv) < 2):
  print('Usage:')
  print('python build.py {chromium_version} {arch_name}')
  print('Example:')
  print('python build.py 4747cc23ae334a57a35ed3c8e6adcdbc8a50d479 x64')
  print('python build.py 4747cc23ae334a57a35ed3c8e6adcdbc8a50d479 arm64 # cross-compile for ARM architecture')
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

# configure environment: environment path
depot_tools_path = os.path.join(build_path, 'depot_tools')
full_path = depot_tools_path + os.pathsep + os.environ['PATH']
print('Updating PATH for depot_tools: ' + full_path)
os.environ['PATH'] = full_path

# configure environment: build dependencies
if platform.system() == 'Linux':
  if arch_name:
    print('Running sysroot install script...')
    runcmd(src_path + '/build/linux/sysroot_scripts/install-sysroot.py --arch=' + arch_name)
  print('Running install-build-deps...')
  runcmd(src_path + '/build/install-build-deps.sh')

print('Updating all modules')
runcmd('gclient sync -D')

print('Setting up build directory')
runcmd('rm -rf out/headless')
runcmd('mkdir out/headless')

# Copy args.gn from the root of our directory to out/headless/args.gn,
# add the target_cpu for cross-compilation
print('Adding target_cpu to args')
argsgn_file_out = path.abspath('out/headless/args.gn')
runcmd('cp ' + argsgn_file + ' ' + argsgn_file_out)
runcmd('echo \'target_cpu="' + arch_name + '"\' >> ' + argsgn_file_out)

runcmd('gn gen out/headless')

# Build Chromium... this takes *forever* on underpowered VMs
print('Compiling... this will take a while')
runcmd('autoninja -C out/headless headless_shell')

# Optimize the output on Linux x64 by stripping inessentials from the binary
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

# Add dependencies that must be bundled with the Chromium executable.
archive_file('headless_shell')
archive_file(path.join('swiftshader', 'libEGL.so'))
archive_file(path.join('swiftshader', 'libGLESv2.so'))

archive.close()

print('Creating ' + path.join(src_path, md5_filename))
with open (md5_filename, 'w') as f:
  f.write(md5_file(zip_filename))

runcmd('gsutil cp ' + path.join(src_path, zip_filename) + ' gs://headless_shell_staging')
runcmd('gsutil cp ' + path.join(src_path, md5_filename) + ' gs://headless_shell_staging')
