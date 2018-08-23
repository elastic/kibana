import subprocess, os, sys, platform, zipfile, hashlib, shutil
from build_util import runcmd, mkdir, md5_file, script_dir, root_dir, configure_environment

# This file builds Chromium headless on Windows, Mac, and Linux.

# Verify that we have an argument, and if not print instructions
if (len(sys.argv) < 2):
  print('Usage:')
  print('python build.py {chromium_version}')
  print('Example:')
  print('python build.py 68.0.3440.106')
  print('python build.py 4747cc23ae334a57a35ed3c8e6adcdbc8a50d479')
  sys.exit(1)

# The version of Chromium we wish to build. This can be any valid git
# commit, tag, or branch, so: 68.0.3440.106 or
# 4747cc23ae334a57a35ed3c8e6adcdbc8a50d479
source_version = sys.argv[1]

print('Building Chromium ' + source_version)

# Set the environment variables required by the build tools
print('Configuring the build environment')
configure_environment()

# Sync the codebase to the correct version, syncing master first
# to ensure that we actually have all the versions we may refer to
print('Syncing source code')

os.chdir(os.path.join(root_dir, 'chromium/src'))

runcmd('git checkout master')
runcmd('git fetch origin')
runcmd('gclient sync --with_branch_heads --with_tags --jobs 16')
runcmd('git checkout ' + source_version)
runcmd('gclient sync --with_branch_heads --with_tags --jobs 16')
runcmd('gclient runhooks')

# Copy build args/{Linux | Darwin | Windows}.gn from the root of our directory to out/headless/args.gn,
platform_build_args = os.path.join(script_dir, platform.system().lower(), 'args.gn')
print('Generating platform-specific args')
print('Copying build args: ' + platform_build_args + ' to out/headless/args.gn')
mkdir('out/headless')
shutil.copyfile(platform_build_args, 'out/headless/args.gn')
runcmd('gn gen out/headless')

# Build Chromium... this takes *forever* on underpowered VMs
print('Compiling... this will take a while')
runcmd('autoninja -C out/headless headless_shell')

# Optimize the output on Linux and Mac by stripping inessentials from the binary
if platform.system() != 'Windows':
  print('Optimizing headless_shell')
  shutil.move('out/headless/headless_shell', 'out/headless/headless_shell_raw')
  runcmd('strip -o out/headless/headless_shell out/headless/headless_shell_raw')

# Create the zip and generate the md5 hash using filenames like:
# chromium-4747cc2-linux.zip
base_filename = 'out/headless/chromium-' + source_version[:7].strip('.') + '-' + platform.system().lower()
zip_filename = base_filename + '.zip'
md5_filename = base_filename + '.md5'

print('Creating ' + zip_filename)
archive = zipfile.ZipFile(zip_filename, mode='w', compression=zipfile.ZIP_DEFLATED)

def archive_file(name):
  """A little helper function to write individual files to the zip file"""
  from_path = os.path.join('out/headless', name)
  to_path = os.path.join('headless_shell-' + platform.system().lower(), name)
  archive.write(from_path, to_path)

# Each platform has slightly different requirements for what dependencies
# must be bundled with the Chromium executable.
if platform.system() == 'Linux':
  archive_file('headless_shell')
elif platform.system() == 'Windows':
  archive_file('headless_shell.exe')
  archive_file('dbghelp.dll')
  archive_file('icudtl.dat')
  archive_file('natives_blob.bin')
  archive_file('snapshot_blob.bin')
elif platform.system() == 'Darwin':
  archive_file('headless_shell')
  archive_file('natives_blob.bin')
  archive_file('snapshot_blob.bin')
  archive_file('Helpers/crashpad_handler')

archive.close()

print('Creating ' + md5_filename)
with open (md5_filename, 'w') as f:
  f.write(md5_file(zip_filename))
